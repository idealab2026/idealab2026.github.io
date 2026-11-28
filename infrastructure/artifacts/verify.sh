#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
VERSION=0.1.0
REV=$(git rev-parse HEAD)
SHORT=$(git rev-parse --short=12 HEAD)
WORK=$(mktemp -d)
HTTP_PID=""
cleanup(){
 if test -n "$HTTP_PID"; then kill "$HTTP_PID" 2>/dev/null || true; fi
 docker rm -f idealab-oci-registry idealab-artifact-api >/dev/null 2>&1 || true
 rm -rf "$WORK"
}
trap cleanup EXIT
python -m venv "$WORK/build"
"$WORK/build/bin/pip" install 'build==1.2.2.post1' 'setuptools==80.9.0' 'wheel==0.45.1'
"$WORK/build/bin/python" -m build --wheel --no-isolation --outdir "$WORK/wheels" infrastructure/api
WHEEL=$(find "$WORK/wheels" -maxdepth 1 -name '*.whl' -print)
test -f "$WHEEL"
HASH=$(sha256sum "$WHEEL" | cut -d' ' -f1)
mkdir -p "$WORK/repository/simple/idea-lab-research-api" "$WORK/repository/packages" "$WORK/downloaded"
cp "$WHEEL" "$WORK/repository/packages/"
NAME=$(basename "$WHEEL")
printf '<a href="../../packages/%s#sha256=%s">%s</a>\n' "$NAME" "$HASH" "$NAME" > "$WORK/repository/simple/idea-lab-research-api/index.html"
python -m http.server 18765 --bind 127.0.0.1 --directory "$WORK/repository" >"$WORK/http.log" 2>&1 &
HTTP_PID=$!
for i in $(seq 1 20); do curl -fsS http://127.0.0.1:18765/simple/idea-lab-research-api/ >/dev/null && break; sleep 1; done
"$WORK/build/bin/pip" download --no-deps --index-url http://127.0.0.1:18765/simple --trusted-host 127.0.0.1 --dest "$WORK/downloaded" "idea-lab-research-api==$VERSION"
test "$(sha256sum "$WORK/downloaded/$NAME" | cut -d' ' -f1)" = "$HASH"
python -m venv "$WORK/consumer"
"$WORK/consumer/bin/pip" install "$WORK/downloaded/$NAME"
(cd "$WORK"; "$WORK/consumer/bin/python" -c 'from importlib.metadata import version; from app.main import app; assert version("idea-lab-research-api")=="0.1.0"; assert app.version=="0.1.0"')
docker run -d --name idealab-oci-registry -p 127.0.0.1:15000:5000 registry:2.8.3
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:15000/v2/ && break; sleep 1; done
IMAGE="127.0.0.1:15000/idea-lab-api:$VERSION-$SHORT"
docker build --label "org.opencontainers.image.revision=$REV" --label "org.opencontainers.image.version=$VERSION" -t "$IMAGE" infrastructure/api
docker push "$IMAGE"
DIGEST=$(docker image inspect "$IMAGE" --format '{{range .RepoDigests}}{{println .}}{{end}}' | grep '^127.0.0.1:15000/idea-lab-api@sha256:' | head -n1)
test -n "$DIGEST"
docker image rm "$IMAGE"
docker pull "$DIGEST"
test "$(docker image inspect "$DIGEST" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$REV"
docker run -d --name idealab-artifact-api -p 127.0.0.1:18080:8080 "$DIGEST"
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:18080/health && break; sleep 1; done
curl -fsS http://127.0.0.1:18080/health
mkdir -p "${ARTIFACT_REPORT_DIR:-$ROOT/../idealab-artifact-report}"
python - "$REV" "$VERSION" "$NAME" "$HASH" "$DIGEST" "${ARTIFACT_REPORT_DIR:-$ROOT/../idealab-artifact-report}/provenance.json" <<'PY'
import json,sys
from pathlib import Path
rev,version,wheel,sha,digest,path=sys.argv[1:]
report={"commit":rev,"version":version,"wheel":wheel,"wheel_sha256":sha,"oci_digest":digest,"wheel_roundtrip_verified":True,"oci_roundtrip_verified":True,"scope":"ephemeral_loopback_registry"}
Path(path).write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report))
PY
