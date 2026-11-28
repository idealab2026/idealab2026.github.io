from pydantic import ValidationError
from .schemas import Algorithm, Algorithms, Result, Results, Forecast, Forecasts, Project
from .sources import PublicSourceClient, SourceUnavailable, ROOT

PROJECTS = (
    Project(id="midas", name="MIDAS", url=ROOT+"laboratorio-cuantitativo/", datasets=["algorithms", "catalog-results"]),
    Project(id="psicohistoria", name="PSICOHISTORIA", url=ROOT+"psicohistoria/", datasets=["newconf-2027"]),
    Project(id="observatorio", name="España en Datos", url=ROOT+"dashboard-gobierno/"),
    Project(id="linea-historia", name="Línea de la Historia", url=ROOT+"linea-historia/"),
    Project(id="la-telarana", name="La Telaraña", url=ROOT+"la-telarana/"),
    Project(id="biblioteca-montecristo", name="Biblioteca de Montecristo", url=ROOT+"biblioteca-montecristo/"),
)

class NotFound(Exception):
    pass

class ResearchService:
    def __init__(self, source: PublicSourceClient):
        self.source = source

    async def roster(self):
        doc, ev = await self.source.read("roster")
        rows = doc.get("entries")
        if doc.get("schema") != "idea_lab_strategy_coverage_v1" or not isinstance(rows, list) or not rows:
            raise SourceUnavailable("Roster schema mismatch")
        try:
            ids = [row["slot"] for row in rows]
            if len(ids) != len(set(ids)) or len(ids) != doc.get("expected"):
                raise ValueError("invalid inventory")
            records = [Result.model_validate({k: row[k] for k in Result.model_fields if k in row}) for row in rows]
        except (ValueError, KeyError, TypeError, ValidationError) as exc:
            raise SourceUnavailable("Roster failed validation") from exc
        return records, ev

    async def algorithms(self, offset: int, limit: int):
        rows, ev = await self.roster()
        return Algorithms(evidence=ev,total=len(rows),items=[
            Algorithm.model_validate(row.model_dump(include=set(Algorithm.model_fields)))
            for row in rows[offset:offset+limit]])

    async def result(self, slot: str):
        rows, ev = await self.roster()
        for row in rows:
            if row.slot == slot:
                return Results(evidence=ev,item=row)
        raise NotFound("Algorithm not found")

    async def forecasts(self, country_id: str | None, offset: int, limit: int):
        doc, ev = await self.source.read("forecast")
        manifest, mev = await self.source.read("manifest")
        rows = doc.get("countries")
        if (doc.get("schema") != "idealab.psico.prospective_newconf_2027.v1"
            or manifest.get("schema") != "idealab.psico.prospective_newconf_2027_manifest.v1"
            or manifest.get("status") != "ISSUED_PROSPECTIVE_UNRESOLVED"
            or manifest.get("forecast_sha256") != ev.sha256
            or manifest.get("forecast_id") != doc.get("forecast_id")
            or manifest.get("target_year") != 2027
            or manifest.get("demonstrated_predictive_skill") is not False
            or not isinstance(rows,list) or len(rows) != manifest.get("issued_country_count")):
            raise SourceUnavailable("Forecast custody validation failed")
        try:
            values = [Forecast(forecast_id=doc["forecast_id"], country_id=x["country_id"],
                      target_year=2027, probability=x["p_model"],
                      baseline_probability=x["p_baseline_global_5y"],status=manifest["status"]) for x in rows]
            if len({x.country_id for x in values}) != len(values):
                raise ValueError("duplicate country")
        except (KeyError,ValueError,TypeError,ValidationError) as exc:
            raise SourceUnavailable("Forecast row invalid") from exc
        if country_id is not None:
            values = [row for row in values if row.country_id == country_id]
            if not values:
                raise NotFound("Country not found")
        return Forecasts(evidence=ev,manifest=mev,total=len(values),items=values[offset:offset+limit])
