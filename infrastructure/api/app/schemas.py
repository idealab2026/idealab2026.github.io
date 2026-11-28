from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, HttpUrl

class PublicModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

class Project(PublicModel):
    id: str
    name: str
    url: HttpUrl
    datasets: list[str] = Field(default_factory=list)

class Evidence(PublicModel):
    source: HttpUrl
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    retrieved_at: datetime

class Algorithm(PublicModel):
    slot: str = Field(pattern=r"^IL-\d{3}$")
    name: str
    group: str
    record_status: str
    activity: str

class Result(Algorithm):
    currency: str | None = None
    last_session: str | None = None
    return_pct: float | None = None
    day_return_pct: float | None = None
    note: str = "Catalog record only; not a current paper leaderboard."

class Forecast(PublicModel):
    forecast_id: str
    country_id: str
    target_year: int
    probability: float = Field(ge=0, le=1)
    baseline_probability: float = Field(ge=0, le=1)
    status: Literal["ISSUED_PROSPECTIVE_UNRESOLVED"]
    demonstrated_predictive_skill: Literal[False] = False

class Algorithms(PublicModel):
    evidence: Evidence
    total: int
    items: list[Algorithm]

class Results(PublicModel):
    evidence: Evidence
    item: Result

class Forecasts(PublicModel):
    evidence: Evidence
    manifest: Evidence
    total: int
    items: list[Forecast]

class Health(PublicModel):
    status: Literal["ok"] = "ok"
    version: str
