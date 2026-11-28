import asyncio,json,logging,time,resource,sys
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Annotated,Literal
import httpx
from fastapi import FastAPI,Depends,HTTPException,Request,Header
from fastapi.responses import HTMLResponse,PlainTextResponse
from pydantic import BaseModel,ConfigDict,Field,ValidationError
from .policy import Settings,MODELS,ALLOW
from .governance import Registry
from .metrics import Metrics

log=logging.getLogger("uvicorn.error")
class Input(BaseModel):
    model_config=ConfigDict(extra="forbid")
    model:Literal["auto","smollm2-135m","qwen3-0.6b","qwen3-0.6b-browser"]="auto"
    question:str=Field(min_length=1,max_length=4000)
    context:str=Field(default="",max_length=8000)
    max_new_tokens:int=Field(default=64,ge=1,le=128)
class Usage(BaseModel):
    input_tokens:int=Field(ge=1,le=8192)
    output_tokens:int=Field(ge=1,le=128)
class BackendResult(BaseModel):
    model_config=ConfigDict(extra="forbid")
    model:str
    revision:str
    text:str=Field(min_length=1,max_length=10000)
    usage:Usage
class Answer(BackendResult):
    project:str
    prompt_version:str
    prompt_sha256:str
    mode:Literal["server"]="server"
    latency_ms:float
    scope:str

def create_app(settings=None,transport=None):
    @asynccontextmanager
    async def lifespan(app):
        cfg=settings or Settings.from_env()
        app.state.cfg=cfg
        app.state.metrics=Metrics(cfg.db,cfg.scope)
        app.state.registry=Registry(cfg.prompts)
        for p in cfg.keys:app.state.registry.active(p)
        async with httpx.AsyncClient(transport=transport,trust_env=False,follow_redirects=False,
                                    timeout=httpx.Timeout(cfg.timeout,connect=3),limits=httpx.Limits(max_connections=8)) as client:
            app.state.http=client;app.state.slots=asyncio.Semaphore(2)
            yield
    app=FastAPI(title="IDEA LAB LLM Gateway",version="0.1.0",lifespan=lifespan)
    def identity(request:Request,x_api_key:Annotated[str|None,Header(max_length=256)]=None):
        p=request.app.state.cfg.identity(x_api_key or "")
        if not p:raise HTTPException(401,"Invalid application credential")
        return p
    def observer(request:Request,x_api_key:Annotated[str|None,Header(max_length=256)]=None):
        if not request.app.state.cfg.can_observe(x_api_key or ""):raise HTTPException(403,"Observer credential required")
    @app.get("/health")
    def health():return {"status":"ok","version":"0.1.0","scope":"process"}
    @app.get("/ready")
    def ready(request:Request):
        return {"status":"ok","scope":"gateway configuration and metrics store; not upstream uptime"}
    @app.get("/v1/models")
    def models(p=Depends(identity)):
        return [{"id":k,"hub":v["hub"],"mode":v["mode"],"revision":v["revision"],
                 "gateway_inference":v["mode"]=="server"} for k,v in MODELS.items() if k in ALLOW[p]]
    @app.get("/v1/prompts/active")
    def active(request:Request,p=Depends(identity)):
        v=request.app.state.registry.active(p)
        return {**v.model_dump(),"sha256":v.digest()}
    @app.post("/v1/generate",response_model=Answer)
    async def generate(body:Input,request:Request,p=Depends(identity)):
        state=request.app.state;cfg=state.cfg;m=state.metrics;start=time.monotonic()
        model=("qwen3-0.6b" if p in ("midas","psicohistoria") else "smollm2-135m") if body.model=="auto" else body.model
        mode=MODELS[model]["mode"];status=500;usage=None;prompt=None
        try:
            if model not in ALLOW[p]:raise HTTPException(403,"Model forbidden for application")
            if mode=="browser":raise HTTPException(409,"Browser-only model; no gateway inference")
            if not m.admit(p,cfg.limit):raise HTTPException(429,"Rate limit exceeded",headers={"Retry-After":"60"})
            prompt=state.registry.active(p)
            payload={"system":prompt.system,"user":prompt.render(body.question,body.context),"max_new_tokens":body.max_new_tokens}
            try:
                async with asyncio.timeout(cfg.timeout):
                    async with state.slots:
                        r=await state.http.post(MODELS[model]["backend"]+"/generate",json=payload)
                        r.raise_for_status()
                        answer=BackendResult.model_validate(r.json())
                if answer.model!=model or answer.revision!=MODELS[model]["revision"] or answer.usage.output_tokens>body.max_new_tokens:
                    raise ValueError("Backend identity or usage mismatch")
            except (TimeoutError,httpx.TimeoutException):raise HTTPException(504,"Inference deadline exceeded")
            except (httpx.HTTPError,ValueError,ValidationError):raise HTTPException(502,"Inference backend failed validation or unavailable")
            usage=answer.usage;status=200
            return Answer(**answer.model_dump(),project=p,prompt_version=prompt.version,prompt_sha256=prompt.digest(),
                latency_ms=(time.monotonic()-start)*1000,scope=cfg.scope)
        except HTTPException as e:
            status=e.status_code;raise
        finally:
            ms=(time.monotonic()-start)*1000
            m.event(p,model,mode,status,ms,usage,prompt)
            log.info(json.dumps({"event":"inference","project":p,"model":model,"mode":mode,"status":status,"latency_ms":round(ms,2),"scope":cfg.scope}))
    @app.get("/v1/metrics",dependencies=[Depends(observer)])
    def metrics(request:Request):return request.app.state.metrics.summary()
    @app.get("/v1/metrics/export",dependencies=[Depends(observer)],response_class=PlainTextResponse)
    def export(request:Request):return request.app.state.metrics.export()
    @app.get("/v1/status",dependencies=[Depends(observer)])
    async def status(request:Request):
        async def probe(model_id,model):
            start=time.monotonic()
            try:
                async with asyncio.timeout(3):
                    r=await request.app.state.http.get(model["backend"]+"/health")
                    r.raise_for_status()
                    payload=r.json()
                    if payload.get("model")!=model_id or payload.get("revision")!=model["revision"]:
                        raise ValueError("Backend identity mismatch")
                return {"model":model_id,"state":"ready","probe_latency_ms":(time.monotonic()-start)*1000,
                        "process":payload.get("process")}
            except (TimeoutError,httpx.HTTPError,ValueError):
                return {"model":model_id,"state":"unavailable","probe_latency_ms":None,"process":None}
        rs=resource.getrusage(resource.RUSAGE_SELF)
        return {"gateway":{"state":"ready","process":{"cpu_seconds":rs.ru_utime+rs.ru_stime,
          "peak_rss_bytes":rs.ru_maxrss*(1 if sys.platform=="darwin" else 1024)}},
          "backends":await asyncio.gather(*(probe(k,v) for k,v in MODELS.items() if v["mode"]=="server")),
          "browser":"not monitored","note":"Point-in-time health only; not historical uptime"}
    @app.get("/architecture",response_class=HTMLResponse)
    def architecture():
        return HTMLResponse(Path(__file__).with_name("architecture.html.txt").read_text(),
             headers={"Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'","Cache-Control":"no-store"})
    @app.get("/dashboard",response_class=HTMLResponse)
    def dashboard():
        return HTMLResponse(Path(__file__).with_name("dashboard.html.txt").read_text(),
             headers={"Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'","Cache-Control":"no-store"})
    return app
app=create_app()
