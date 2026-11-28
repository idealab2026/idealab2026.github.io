# Artifact lifecycle: local zero-cost demonstration

This is **not JFrog Artifactory**. The official free self-managed JFrog Container Registry edition supports container/Helm workflows but not native PyPI repositories. Full Artifactory has richer access control, remote proxying, virtual repositories, promotion and security integrations; no license or paid service has been activated.

The demo exercises a Python wheel with a local PEP 503 simple index and an OCI image with the open-source Distribution registry. Both servers are ephemeral and bind to loopback only. CI builds the wheel and image, publishes to each local repository, retrieves the wheel via pip and verifies its SHA-256, pulls the image by immutable digest and verifies its commit/version OCI labels, then executes the retrieved image. The provenance manifest links package version, commit and digests. Nothing is published to public PyPI or a hosted registry.

Run on Linux or a Mac with Docker and Python installed. On macOS, install GNU coreutils (or replace sha256sum with shasum -a 256); the CI test uses Linux. From repo root:
```sh
export ARTIFACT_REPORT_DIR="$(mktemp -d)"
bash infrastructure/artifacts/verify.sh
cat "$ARTIFACT_REPORT_DIR/provenance.json"
```
For production use a proper authenticated TLS repository; this localhost test does not provide external repository security or persistence.

ES: El paquete wheel y la imagen OCI se versionan y se publican en registros temporales. Se recuperan y verifican sus hashes para asegurar trazabilidad entre commit, versión y artefacto.
EN: The pipeline builds, publishes and retrieves versioned Python and OCI artifacts, verifying package SHA-256 and immutable image digest with OCI provenance labels.

Q: Docker tag vs digest? A: Tags are mutable aliases; digests identify immutable manifest content.
Q: Is this direct Artifactory experience? A: No; it demonstrates equivalent basic artifact lifecycle concepts using a simple index and Distribution registry.
Q: Why no cloud registry? A: Avoid billing, credentials and external publication.
