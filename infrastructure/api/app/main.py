import json
import logging
import time
from contextlib import asynccontextmanager
from typing import Annotated
import httpx
from fastapi import FastAPI, Depends, Path, Query, Request
from fastapi.responses import JSONResponse
from .schemas import Algorithms, Results, Forecasts, Project, Health
from .service import ResearchService, PROJECTS, NotFound
from .sources import PublicSourceClient, SourceUnavailable

VERSION = "0.1.0"
log = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0),
                                 follow_redirects=False, trust_env=False,
                                 limits=httpx.Limits(max_connections=8)) as client:
        app.state.service = ResearchService(PublicSourceClient(client))
        yield

def service(request: Request) -> ResearchService:
    return request.app.state.service

Svc = Annotated[ResearchService, Depends(service)]
Offset = Annotated[int, Query(ge=0, le=10000)]
Limit = Annotated[int, Query(ge=1, le=100)]

def create_app() -> FastAPI:
    app = FastAPI(title="IDEA LAB Public Research API", version=VERSION, lifespan=lifespan,
                  description="Read-only institutional sources; no investment advice or live trading.")

    @app.middleware("http")
    async def access_log(request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)
        route = request.scope.get("route")
        log.info(json.dumps({"event":"request","method":request.method,
                            "route":getattr(route,"path","unmatched"),
                            "status":response.status_code,"duration_ms":round((time.monotonic()-start)*1000,2)}))
        return response

    @app.exception_handler(SourceUnavailable)
    async def unavailable(_request: Request, _exc: SourceUnavailable):
        return JSONResponse(status_code=503,content={"detail":"Public dataset unavailable or unverified"})

    @app.exception_handler(NotFound)
    async def not_found(_request: Request, exc: NotFound):
        return JSONResponse(status_code=404,content={"detail":str(exc)})

    @app.get("/health", response_model=Health)
    async def health():
        return Health(version=VERSION)

    @app.get("/v1/projects", response_model=list[Project])
    async def projects():
        return list(PROJECTS)

    @app.get("/v1/projects/{project_id}",response_model=Project)
    async def project(project_id: Annotated[str,Path(pattern=r"^[a-z0-9-]{1,40}$")]):
        for item in PROJECTS:
            if item.id == project_id:
                return item
        raise NotFound("Project not found")

    @app.get("/v1/midas/algorithms",response_model=Algorithms)
    async def algorithms(svc: Svc, offset: Offset=0, limit: Limit=25):
        return await svc.algorithms(offset,limit)

    @app.get("/v1/midas/results/{slot}",response_model=Results)
    async def result(slot: Annotated[str,Path(pattern=r"^IL-\d{3}$")],svc: Svc):
        return await svc.result(slot)

    @app.get("/v1/psicohistoria/predictions",response_model=Forecasts)
    async def predictions(svc: Svc,country_id: Annotated[str|None,Query(pattern=r"^\d{1,4}$")]=None,
                          offset: Offset=0,limit: Limit=25):
        return await svc.forecasts(country_id,offset,limit)

    return app

app = create_app()
