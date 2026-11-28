"""Git-versioned prompt templates. Local activation only; no administrative HTTP route."""
import hashlib,json,re,string,argparse,difflib,os
from pathlib import Path
from .policy import PROJECTS
from pydantic import BaseModel,ConfigDict,Field

class Prompt(BaseModel):
    model_config=ConfigDict(extra="forbid",frozen=True)
    project:str
    purpose:str
    version:str
    system:str=Field(min_length=10,max_length=4000)
    template:str=Field(min_length=10,max_length=4000)
    change:str
    def digest(self):
        return hashlib.sha256(self.model_dump_json().encode()).hexdigest()
    def render(self,question,context=""):
        return self.template.format(question=question,context=context or "(no context provided)")

def evaluate(p):
    # Contract tests, NOT an LLM quality/safety evaluation.
    fields=[name for _,name,spec,conv in string.Formatter().parse(p.template) if name is not None and not spec and not conv]
    try:
        sample=p.render("QUESTION_SENTINEL","CONTEXT_SENTINEL")
        tests={"known_project":p.project in PROJECTS,"purpose":p.purpose=="assistant",
          "version":bool(re.fullmatch(r"v[1-9][0-9]*",p.version)),
          "template_fields":sorted(fields)==["context","question"],
          "question_preserved":sample.count("QUESTION_SENTINEL")==1,"context_preserved":sample.count("CONTEXT_SENTINEL")==1,
          "grounding_instruction":"do not invent" in p.system.lower(),
          "data_not_instruction":"untrusted data" in p.system.lower()}
    except (ValueError,KeyError,AttributeError,IndexError):
        tests={"valid_render":False}
    return tests

class Registry:
    def __init__(self,root):
        self.root=Path(root)
    def get(self,project,version):
        if project not in PROJECTS or not re.fullmatch(r"v[1-9][0-9]*",version):raise ValueError("Invalid prompt identifier")
        p=Prompt.model_validate_json((self.root/project/(version+".json")).read_text())
        if p.project!=project or p.version!=version or not all(evaluate(p).values()):raise ValueError("Prompt contract failed")
        return p
    def active(self,project):
        row=json.loads((self.root/"active.json").read_text())[project]
        p=self.get(project,row["version"])
        if row["sha256"]!=p.digest():raise ValueError("Active prompt hash mismatch")
        return p
    def activate(self,project,version):
        p=self.get(project,version)
        path=self.root/"active.json"
        active=json.loads(path.read_text())
        active[project]={"version":version,"sha256":p.digest()}
        tmp=path.with_suffix(".tmp")
        tmp.write_text(json.dumps(active,indent=2)+"\n")
        os.replace(tmp,path)
        return p
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--root",default="prompts");parser.add_argument("action",choices=["evaluate","compare","activate"])
    parser.add_argument("project",choices=PROJECTS);parser.add_argument("version");parser.add_argument("other",nargs="?")
    a=parser.parse_args();r=Registry(a.root);p=r.get(a.project,a.version)
    if a.action=="evaluate":print(json.dumps({"contract_only":True,"tests":evaluate(p),"sha256":p.digest()}))
    elif a.action=="activate":print(r.activate(a.project,a.version).model_dump_json())
    else:
        if not a.other:parser.error("compare requires a second version")
        q=r.get(a.project,a.other)
        print("\n".join(difflib.unified_diff(p.model_dump_json(indent=2).splitlines(),q.model_dump_json(indent=2).splitlines(),fromfile=p.version,tofile=q.version)))
if __name__=="__main__":main()
