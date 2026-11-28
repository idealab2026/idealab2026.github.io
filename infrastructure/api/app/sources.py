"""Only fixed, anonymous HTTPS GETs to explicitly admitted public Pages assets."""
import hashlib
import json
from datetime import datetime, timezone
from typing import Any
import httpx
from .schemas import Evidence

ROOT = "https://idealab2026.github.io/"
SOURCES = {
    "roster": ROOT + "laboratorio-cuantitativo/data/competition-roster.json",
    "forecast": ROOT + "psicohistoria/data/forecast-2027-newconf.json",
    "manifest": ROOT + "psicohistoria/data/forecast-2027-newconf-manifest.json",
}
MAX_BYTES = 2_000_000

class SourceUnavailable(Exception):
    pass

class PublicSourceClient:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def read(self, key: str) -> tuple[dict[str, Any], Evidence]:
        url = SOURCES[key]
        try:
            async with self.client.stream("GET", url, headers={"Accept": "application/json"}) as response:
                response.raise_for_status()
                buf = bytearray()
                async for chunk in response.aiter_bytes():
                    buf.extend(chunk)
                    if len(buf) > MAX_BYTES:
                        raise ValueError("response too large")
            raw = bytes(buf)
            payload = json.loads(raw)
            if not isinstance(payload, dict):
                raise ValueError("expected object")
            return payload, Evidence(source=url, sha256=hashlib.sha256(raw).hexdigest(),
                                     retrieved_at=datetime.now(timezone.utc))
        except (httpx.HTTPError, ValueError, UnicodeError) as exc:
            raise SourceUnavailable("Public dataset unavailable or invalid") from exc
