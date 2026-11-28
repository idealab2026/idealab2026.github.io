import os,secrets,sys
from pathlib import Path
p=Path(sys.argv[1])
fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,"w") as f:
    for name in ("KEY_MIDAS","KEY_PSICOHISTORIA","KEY_OBSERVATORIO","KEY_LA_TELARANA","OBSERVER_KEY"):
        f.write(name+"="+secrets.token_urlsafe(32)+"\n")
