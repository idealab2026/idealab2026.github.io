"""Local CPU inference. Fixed HF model and revision, no remote inference API."""
import os,threading
from contextlib import asynccontextmanager
from fastapi import FastAPI,HTTPException
from pydantic import BaseModel,ConfigDict,Field
from app.policy import MODELS
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM

class Request(BaseModel):
    model_config=ConfigDict(extra="forbid")
    system:str=Field(max_length=4000)
    user:str=Field(max_length=16000)
    max_new_tokens:int=Field(ge=1,le=128)

model_id=os.environ["SERVER_MODEL"]
spec=MODELS[model_id]
if spec["mode"]!="server":raise RuntimeError("Not a server model")
lock=threading.Lock()
@asynccontextmanager
async def lifespan(app):
    torch.set_num_threads(2)
    tok=AutoTokenizer.from_pretrained(spec["hub"],revision=spec["revision"],trust_remote_code=False)
    model=AutoModelForCausalLM.from_pretrained(spec["hub"],revision=spec["revision"],trust_remote_code=False,use_safetensors=True,torch_dtype=torch.float32)
    model.eval()
    app.state.tok=tok;app.state.model=model
    yield
app=FastAPI(lifespan=lifespan)
@app.get("/health")
def health():return {"status":"ok","model":model_id,"revision":spec["revision"]}
@app.post("/generate")
def generate(body:Request):
    if not lock.acquire(blocking=False):raise HTTPException(503,"Backend busy")
    try:
        tok=app.state.tok;model=app.state.model
        msgs=[{"role":"system","content":body.system},{"role":"user","content":body.user}]
        kwargs={"enable_thinking":False} if model_id.startswith("qwen") else {}
        inputs=tok.apply_chat_template(msgs,tokenize=True,add_generation_prompt=True,return_tensors="pt",**kwargs)
        n=inputs.shape[-1]
        if n>4096:raise HTTPException(413,"Token limit exceeded")
        with torch.inference_mode():
            output=model.generate(inputs,attention_mask=torch.ones_like(inputs),max_new_tokens=body.max_new_tokens,do_sample=False,pad_token_id=tok.eos_token_id)
        generated=output[0,n:]
        text=tok.decode(generated,skip_special_tokens=True).strip()
        if not text:raise HTTPException(502,"Empty generation")
        return {"model":model_id,"revision":spec["revision"],"text":text,"usage":{"input_tokens":n,"output_tokens":len(generated)}}
    finally:lock.release()
