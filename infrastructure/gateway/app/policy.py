import os, hmac
from pathlib import Path
from dataclasses import dataclass

PROJECTS=("midas","psicohistoria","observatorio","la-telarana")
MODELS={
 "smollm2-135m":{"hub":"HuggingFaceTB/SmolLM2-135M-Instruct","revision":"ee72e5415c002e8fc0566a191a07c0b2b708875a","mode":"server","backend":"http://smol:8081"},
 "qwen3-0.6b":{"hub":"Qwen/Qwen3-0.6B","revision":"e6de91484c29aa9480d55605af694f39b081c455","mode":"server","backend":"http://qwen:8081"},
 "qwen3-0.6b-browser":{"hub":"onnx-community/Qwen3-0.6B-ONNX","mode":"browser","revision":"73cec0998040f94767c64bf28ae51b1c4185d1a8"}
}
# Example policy: heavier backend reserved for MIDAS and PSICOHISTORIA.
ALLOW={p:{"smollm2-135m","qwen3-0.6b-browser"}|({"qwen3-0.6b"} if p in ("midas","psicohistoria") else set()) for p in PROJECTS}
@dataclass(frozen=True)
class Settings:
    keys:dict
    observer:str
    scope:str="local_demo"
    limit:int=12
    timeout:float=45
    db:str="/data/metrics.db"
    prompts:str="/app/prompts"
    def __post_init__(self):
        values=list(self.keys.values())+[self.observer]
        if set(self.keys)!=set(PROJECTS) or any(len(v)<32 for v in values) or len(set(values))!=len(values):
            raise ValueError("Distinct secrets of at least 32 characters required")
        if self.scope not in ("ci_test","local_demo") or not 1<=self.limit<=60 or not 1<=self.timeout<=120:
            raise ValueError("Invalid local configuration")
    @classmethod
    def from_env(cls):
        def secret(name):
            path=os.getenv(name+"_FILE")
            return Path(path).read_text().strip() if path else os.environ.get(name,"")
        return cls({p:secret("KEY_"+p.upper().replace("-","_")) for p in PROJECTS},
          secret("OBSERVER_KEY"),os.getenv("METRICS_SCOPE","local_demo"),int(os.getenv("REQUESTS_PER_MINUTE","12")),
          float(os.getenv("INFERENCE_TIMEOUT","45")),os.getenv("METRICS_DB","/data/metrics.db"),os.getenv("PROMPT_DIR","/app/prompts"))
    def identity(self,key):
        for p,v in self.keys.items():
            if hmac.compare_digest(key.encode(),v.encode()):return p
        return None
    def can_observe(self,key):
        return hmac.compare_digest(key.encode(),self.observer.encode())
