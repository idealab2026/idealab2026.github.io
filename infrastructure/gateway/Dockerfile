FROM python:3.12.10-slim AS gateway
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && groupadd -g 10001 svc && useradd -u 10001 -g 10001 -M svc && mkdir /data && chown 10001:10001 /data
COPY --chown=10001:10001 app ./app
COPY --chown=10001:10001 prompts ./prompts
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health',timeout=2).close()"
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8080","--no-access-log"]
FROM gateway AS inference
USER root
COPY backend/requirements.txt /tmp/model-requirements.txt
RUN pip install --no-cache-dir torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir -r /tmp/model-requirements.txt && mkdir /hf && chown 10001:10001 /hf
COPY --chown=10001:10001 backend ./backend
ENV HF_HOME=/hf HF_HUB_DISABLE_TELEMETRY=1 HF_HUB_DISABLE_XET=1
USER 10001:10001
EXPOSE 8081
HEALTHCHECK --interval=5s --timeout=3s --start-period=240s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8081/health',timeout=2).close()"
CMD ["uvicorn","backend.main:app","--host","0.0.0.0","--port","8081","--no-access-log"]
