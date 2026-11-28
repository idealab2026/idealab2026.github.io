# IDEA LAB — LLM Gateway and engineering learning guide

Institutional scope only. The code references point to isolated PR commits, not production deployments. CI evidence is the source of truth; an in-progress run must not be described as successful. The public assistants are not connected to the gateway. No billing authorization, credentials or paid services. Each card includes reproducible instructions in the linked README. 

## LLM Gateway

**Qué es, finalidad y elección:** Proxy de inferencia que aplica políticas transversales; desacopla aplicaciones y modelos, evita repetir integración y facilita gobierno.

**Funcionamiento interno:** Identifica la aplicación por credencial, selecciona un modelo permitido, renderiza el prompt activo y hace una petición HTTP al backend correspondiente. No aloja los pesos en el gateway.

**Aplicación y estado:** Gateway institucional para cuatro aplicaciones configuradas; dos servidores CPU reales y catálogo de modelo WebGPU. Los sitios públicos no se han conectado.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/app/main.py). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46137957980).

**Limitaciones y alternativas:** No es un proxy de inferencia del navegador. La limitación actual es por host; sin TLS público ni IAM. Alternativas: LiteLLM, Envoy, Kong y gateways gestionados.

**ES:** Autentica y enruta peticiones a modelos, mide su utilización y aplica políticas de acceso.

**EN:** It authenticates and routes model requests, enforces application policies and measures usage.

### Preguntas de entrevista

1. **Gateway vs model server:** El gateway decide y aplica políticas; el backend carga pesos y ejecuta la generación.
2. **Cómo enrutas:** Registro fijo, allowlist por aplicación y modelo automático o solicitado; destino HTTP predefinido.
3. **Qué es una fallback policy:** Cambio explícito de modelo bajo reglas de autorización y coste; aquí no se ocultan fallos mediante fallback.
4. **Cómo evitas SSRF:** El cliente no proporciona URLs: los destinos están definidos en el registro.
5. **Cómo escalarías:** Gateway stateless con almacenamiento compartido transaccional, backends separados y límites de concurrencia.

## FastAPI

**Qué es, finalidad y elección:** Framework ASGI para APIs Python tipadas; Swagger/OpenAPI automático y soporte asíncrono.

**Funcionamiento interno:** Rutas, dependencias, middleware, lifespan y cliente HTTP asíncrono. Se inicia el cliente y el registro en lifespan, se cierran recursos al finalizar.

**Aplicación y estado:** Gateway /v1/generate, /v1/models, /v1/prompts/active, /health; API de investigación ya probada.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/app/main.py). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46137957980).

**Limitaciones y alternativas:** ASGI no vuelve asíncrono el cómputo de PyTorch; éste se aísla en backend. Alternativas: Flask, Django REST, Go/Fiber.

**ES:** La capa REST valida peticiones y usa I/O asíncrono para invocar servicios de inferencia.

**EN:** The REST layer validates requests and uses asynchronous I/O to call inference services.

### Preguntas de entrevista

1. **ASGI vs WSGI:** ASGI admite tareas asíncronas y conexiones de larga duración; WSGI es síncrono.
2. **Qué hace Depends:** Inyecta lógica reutilizable, aquí autenticación y autorización de observación.
3. **Qué es lifespan:** Gestiona recursos del proceso al iniciar y parar.
4. **Qué es OpenAPI:** Contrato legible por máquina de rutas y esquemas; Swagger es su interfaz interactiva.
5. **Qué significan 401,403,429,502,504:** Credencial ausente/inválida, permiso denegado, límite, error upstream y timeout.

## Pydantic

**Qué es, finalidad y elección:** Valida y serializa datos con modelos tipados. Evita contratos ambiguos y respuestas mal formadas.

**Funcionamiento interno:** BaseModel, Field y Literal limitan tipo, longitud y rango; extra=forbid rechaza parámetros inesperados. Se valida también la identidad de la respuesta upstream.

**Aplicación y estado:** Input, Usage, BackendResult y Answer del gateway; esquemas de investigación.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/app/main.py). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46137957980).

**Limitaciones y alternativas:** No garantiza veracidad semántica del LLM ni sustituye límites del proxy. Alternativas: Marshmallow, attrs y JSON Schema.

**ES:** Pydantic convierte la API en un contrato validado en ambos sentidos.

**EN:** Pydantic provides validated request and response contracts.

### Preguntas de entrevista

1. **Validación vs type hints:** Las anotaciones Python no validan por sí solas; Pydantic comprueba valores.
2. **Por qué extra=forbid:** Evita aceptar campos no previstos como project o una URL arbitraria.
3. **Validar respuesta upstream:** Impide aceptar tokens o identidad de modelo incompatibles.
4. **Qué devuelve FastAPI ante entrada inválida:** 422; no se ejecuta inferencia.
5. **Garantiza una respuesta verdadera:** No, solo estructura y restricciones del contrato.

## Docker y Compose

**Qué es, finalidad y elección:** Imágenes y contenedores reproducibles; Compose declara servicios, redes y volúmenes.

**Funcionamiento interno:** Dockerfile multistage separa gateway ligero del runtime de inferencia. Compose conecta DNS internos, monta caché de modelos y SQLite; solo expone loopback.

**Aplicación y estado:** Gateway y dos backends realmente ejecutados en CI, UID no privilegiado.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/Dockerfile). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46137957980).

**Limitaciones y alternativas:** Versiones fijadas pero base tag no digest y dependencias indirectas no totalmente bloqueadas. ARM requiere validación. Alternativas Podman y containerd; Compose no sustituye Kubernetes.

**ES:** Contenerizamos los servicios con dependencias separadas y persistimos la caché y métricas en volúmenes.

**EN:** We containerize services with separate dependencies, persisting model caches and metrics in volumes.

### Preguntas de entrevista

1. **Imagen vs contenedor:** La imagen es el artefacto de capas; contenedor es una instancia en ejecución.
2. **Multistage:** Permite separar dependencias y reducir la imagen de distribución.
3. **Bind vs volume:** Bind usa ruta del host; volume es gestionado por el runtime.
4. **Por qué no root:** Reduce privilegios del proceso; no elimina todos los riesgos.
5. **Compose vs Kubernetes:** Compose orquesta un host; Kubernetes reconcilia el estado deseado y administra réplicas.

## Transformers y Hugging Face

**Qué es, finalidad y elección:** Biblioteca de inferencia y repositorio de modelos; separa descarga de ejecución.

**Funcionamiento interno:** Se descarga tokenizer y pesos safetensors en una revisión fija; apply_chat_template forma el input, generate produce tokens; PyTorch en CPU.

**Aplicación y estado:** Backends Qwen3 0.6B y SmolLM2 135M. Modelo ONNX browser se declara aparte; no se ejecuta en gateway.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/backend/main.py). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46137957980).

**Limitaciones y alternativas:** Inferencia pequeña experimental sin evaluación semántica. Qwen de servidor no es el ONNX cuantizado de MIDAS. Alternativas llama.cpp, vLLM, ONNX Runtime.

**ES:** El backend carga pesos y tokenizador localmente y genera con PyTorch; no llama a la API de inferencia del Hub.

**EN:** The backend loads model weights and tokenizer locally and generates with PyTorch; it does not call hosted inference.

### Preguntas de entrevista

1. **Hub vs Inference API:** Repositorio de artefactos frente a endpoint de ejecución remoto.
2. **Qué es tokenizer:** Mapea texto a IDs y viceversa.
3. **Qué es max_new_tokens:** Límite de tokens generados, separado del prompt.
4. **Qué es cuantización:** Reduce precisión de pesos y/o activaciones; memoria y calidad pueden cambiar.
5. **Qué es revision:** Referencia inmutable de los archivos del modelo; facilita reproducibilidad.

## LLM Observability

**Qué es, finalidad y elección:** Métricas operativas y de calidad para evaluar un sistema, no solo el modelo.

**Funcionamiento interno:** Registra eventos sin contenido de usuario: estado HTTP, latencia, tokens, aplicación, modelo, versión/hash de prompt. SQLite y agregaciones por día; exportación NDJSON.

**Aplicación y estado:** Panel protegido /dashboard; /architecture añade probes actuales y CPU/RSS del proceso.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/819368405e7f3616f40350e793e0a4ea8477945f/infrastructure/gateway/app/architecture.html). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46138107679).

**Limitaciones y alternativas:** No hay tráfico público, telemetría browser ni uptime histórico. p95 sobre dos llamadas no es un SLA. Alternativas Prometheus, OpenTelemetry, Grafana y Cloud Logging.

**ES:** Medimos tokens reales, errores y latencia del gateway y separamos el alcance de pruebas del tráfico real.

**EN:** We measure actual token counts, errors and latency and keep test scope separate from real traffic.

### Preguntas de entrevista

1. **Qué es p95:** Umbral bajo el que cae aproximadamente el 95% de las observaciones; depende de la muestra.
2. **Por qué no loguear prompts:** Privacidad, seguridad y volumen; métricas agregadas bastan para operación básica.
3. **Uptime vs readiness:** Uptime requiere series temporales; readiness comprueba disponibilidad actual.
4. **Cómo medir tokens:** Con el tokenizer del modelo y longitud generada, no contando palabras.
5. **Cómo medir calidad RAG:** Recall@k, relevancia, fidelidad y respuestas verificadas; no se deducen de latencia.

## Prompt Governance

**Qué es, finalidad y elección:** Registro versionado de instrucciones y plantillas; permite auditar cambios y rollback.

**Funcionamiento interno:** JSON inmutable por proyecto/versión, SHA-256, puntero activo y CLI de evaluación de contratos, diff y activación.

**Aplicación y estado:** 4 proyectos con v1/v2; gateway inserta la plantilla activa y registra su hash.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/app/governance.py). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46137957980).

**Limitaciones y alternativas:** La evaluación de contrato no demuestra seguridad ante prompt injection ni calidad semántica. Sin API administrativa ni integración browser. Alternativas MLflow Prompt Registry, LangSmith, Git puro.

**ES:** Versionamos el prompt y verificamos su hash antes de utilizarlo en inferencia.

**EN:** We version prompts and verify the active prompt hash before inference.

### Preguntas de entrevista

1. **Qué versionar:** Instrucción de sistema, plantilla, propósito, proyecto, parámetros y evaluaciones.
2. **Cómo rollback:** Volver a activar versión anterior y reconstruir/recargar después de revisar.
3. **Qué mide el contrato:** Campos válidos, renderizado y preservación de entradas; no calidad de respuestas.
4. **Qué es prompt injection:** Datos externos intentan convertirse en instrucciones; separar contexto y tratarlo como no confiable.
5. **Qué falta para producción:** Evaluación semántica y adversarial, aprobación, control de cambios y trazabilidad.

## Kubernetes

**Qué es, finalidad y elección:** Orquestador declarativo de contenedores. Controladores reconcilian réplicas y despliegues.

**Funcionamiento interno:** Namespace, Deployment, Service, PVC, ConfigMap, Secret y probes. Deployment crea ReplicaSets; el Service expone endpoint estable.

**Aplicación y estado:** API de investigación probada en kind; gateway con recuperación de pod, escalado y rollback observados; primera comprobación de HTTP falló, corrección y revalidación en curso.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/819368405e7f3616f40350e793e0a4ea8477945f/infrastructure/gateway/k8s/gateway.yaml). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/819368405e7f3616f40350e793e0a4ea8477945f/infrastructure/gateway/k8s/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46138552564).

**Limitaciones y alternativas:** No es GKE ni cluster multi-nodo. ReadWriteOnce limita acceso a un nodo; SQLite no es solución distribuida. Secret no implica cifrado. Alternativas k3d, Minikube, Nomad.

**ES:** Desplegamos servicios mediante Deployments y Services y verificamos recuperación y escalado bajo condiciones locales.

**EN:** We deploy services via Deployments and Services and test recovery and scaling under local conditions.

### Preguntas de entrevista

1. **Pod vs Deployment:** Pod ejecuta contenedores; Deployment reconcilia réplicas y revisiones.
2. **Service vs Ingress:** Service da endpoint estable; Ingress enruta tráfico HTTP externo mediante controlador.
3. **Readiness vs liveness:** Readiness controla recepción de tráfico; liveness reinicia ante fallo.
4. **Qué pasa al borrar un pod:** El controlador crea un sustituto para alcanzar el número deseado.
5. **Qué significa RWO:** El volumen puede montarse en un nodo; no equivale a base distribuida.

## PyTorch

**Qué es, finalidad y elección:** Framework de Deep Learning con autograd y bucle de entrenamiento explícito.

**Funcionamiento interno:** nn.LSTM + Linear, DataLoader, L1Loss, Adam, zero_grad, backward y step. 2 vectores de sesgo por puerta.

**Aplicación y estado:** LSTM experimental MIDAS con 26 lags, 24 unidades, 2617 parámetros teóricos, holdout cronológico purgado.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/7b59d8e9b2e5196d959ab058e4dc819d08acef10/infrastructure/experiments/midas_lstm/benchmark.py). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/7b59d8e9b2e5196d959ab058e4dc819d08acef10/infrastructure/experiments/midas_lstm/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46138264751).

**Limitaciones y alternativas:** Comparación real de mercado pendiente de matrices congeladas; pruebas sintéticas no prueban habilidad bursátil. Alternativas TensorFlow/Keras, JAX.

**ES:** PyTorch permite controlar el bucle de entrenamiento y la propagación de gradientes explícitamente.

**EN:** PyTorch allows explicit control of the training loop and gradient backpropagation.

### Preguntas de entrevista

1. **Qué hace backward:** Calcula gradientes de la pérdida con autograd.
2. **Por qué zero_grad:** Los gradientes se acumulan por defecto.
3. **Qué hace optimizer.step:** Actualiza parámetros con los gradientes y estado de Adam.
4. **train vs eval:** Cambian comportamiento de capas como dropout; inference_mode desactiva autograd.
5. **Por qué purgar:** Impide que etiquetas de entrenamiento terminen dentro del horizonte de validación.

## TensorFlow / Keras

**Qué es, finalidad y elección:** Framework y API de alto nivel de redes neuronales; entrenamiento mediante compile/fit.

**Funcionamiento interno:** Sequential, Input(26,1), LSTM(24), Dense(1), Adam y MAE; mismo preprocesado y split que PyTorch.

**Aplicación y estado:** MIDAS tiene una implementación institucional real y forecast fechado; comparación experimental separada con 2521 parámetros teóricos.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/7b59d8e9b2e5196d959ab058e4dc819d08acef10/infrastructure/experiments/midas_lstm/benchmark.py). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/7b59d8e9b2e5196d959ab058e4dc819d08acef10/infrastructure/experiments/midas_lstm/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46133977178).

**Limitaciones y alternativas:** Inicializadores, sesgos y optimizador pueden diferir; no comparar cifras sintéticas con métricas reales. Alternativas PyTorch, JAX.

**ES:** Keras encapsula entrenamiento mediante fit y replica la arquitectura LSTM original en el experimento.

**EN:** Keras encapsulates training in fit and reproduces the original LSTM architecture in the experiment.

### Preguntas de entrevista

1. **Cuántos parámetros:** Keras 4h(h+i+1)+h+1 =2521, PyTorch 2617 por sesgo adicional.
2. **LSTM vs RNN:** Puertas controlan actualización y memoria; ayudan a manejar dependencias largas.
3. **MAE vs RMSE:** MAE penaliza linealmente; RMSE es más sensible a errores grandes.
4. **Por qué shuffle=False:** Conserva orden del conjunto de entrenamiento; el split cronológico sigue siendo esencial.
5. **Qué es data leakage:** Uso de información no disponible en el instante de predicción.

## MLflow

**Qué es, finalidad y elección:** Tracking de experimentos, artefactos y registro/versionado de modelos.

**Funcionamiento interno:** SQLite guarda metadatos de runs; log_params, log_metrics y log_model crean trazabilidad; registro asigna versiones.

**Aplicación y estado:** MIDAS PyTorch/Keras y reconstrucción NEWCONF Psicohistoria registrados como versión 1 en CI.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/7b59d8e9b2e5196d959ab058e4dc819d08acef10/infrastructure/experiments/midas_lstm/benchmark.py). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/7b59d8e9b2e5196d959ab058e4dc819d08acef10/infrastructure/experiments/midas_lstm/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46133977178).

**Limitaciones y alternativas:** Registro efímero en CI, no servidor persistente ni promoción productiva. Alternativas Weights & Biases, DVC, Vertex Model Registry.

**ES:** Registramos hiperparámetros, métricas, hashes, artefactos y versiones de modelos.

**EN:** We log hyperparameters, metrics, hashes, artifacts and model versions.

### Preguntas de entrevista

1. **Run vs experiment:** Run es una ejecución; experiment agrupa ejecuciones.
2. **Artifact vs metric:** Artefacto es un archivo/modelo; métrica es un valor medido.
3. **Model registry:** Versiona y gobierna modelos; registrar no significa desplegar.
4. **Cómo reproducir:** Datos, código, configuración, entorno y semilla versionados.
5. **Por qué no promover:** Una prueba sintética o reconstrucción no cumple validación de producción.

## Apache Airflow

**Qué es, finalidad y elección:** Orquestación de tareas batch mediante DAGs, dependencias y reintentos.

**Funcionamiento interno:** TaskFlow declara funciones y dependencias; dag.test ejecuta DAG local; SQLite guarda estado. Quality gate impide publicación ante discrepancia.

**Aplicación y estado:** Reproducción real del benchmark retrospectivo COUP, 45 folds y 8241 observaciones.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/7dba16026cc1f3b896be602af90416ff6bed7874/infrastructure/experiments/psico/coup_dag.py). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/7dba16026cc1f3b896be602af90416ff6bed7874/infrastructure/experiments/psico/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46134211493).

**Limitaciones y alternativas:** No reemplaza scheduler productivo ni demuestra predicción nueva. Alternativas Prefect, Dagster, Argo Workflows.

**ES:** Orquestamos extracción, validación, ajuste, evaluación y publicación local condicionada.

**EN:** We orchestrate extraction, validation, fitting, evaluation and quality-gated local publication.

### Preguntas de entrevista

1. **Qué es DAG:** Grafo dirigido acíclico de dependencias.
2. **Qué es retry:** Reintento automático de tarea fallida bajo política.
3. **Qué es idempotencia:** Ejecutar dos veces sin duplicar efectos ni cambiar datos congelados.
4. **Qué es XCom:** Intercambio de metadatos pequeños entre tareas; no usar para datasets grandes.
5. **Qué publica este DAG:** Informe local de reproducción; ninguna nueva predicción.

## Alibi

**Qué es, finalidad y elección:** Biblioteca XAI para explicaciones de predicciones y sensibilidad de modelos.

**Funcionamiento interno:** KernelSHAP aproxima contribuciones de features; agrupamos recuentos históricos para preservar combinaciones factibles; se comprueba aditividad.

**Aplicación y estado:** 196 probabilidades NEWCONF congeladas, explicaciones locales/globales y sensibilidad al estado de actividad.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/7dba16026cc1f3b896be602af90416ff6bed7874/infrastructure/experiments/psico/explain_newconf.py). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/7dba16026cc1f3b896be602af90416ff6bed7874/infrastructure/experiments/psico/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46134211493).

**Limitaciones y alternativas:** SHAP no establece causalidad; cambiar actividad es sensibilidad del modelo, no intervención. Alternativas SHAP, LIME, Captum.

**ES:** Explicamos el modelo probabilístico congelado, comprobando reconstrucción y aditividad de SHAP.

**EN:** We explain the frozen probability model and verify reconstruction and SHAP additivity.

### Preguntas de entrevista

1. **SHAP qué mide:** Contribución a la diferencia frente a una predicción de referencia.
2. **Local vs global:** Local explica una predicción; global agrega magnitudes.
3. **Por qué agrupar features:** Evita combinaciones imposibles de eventos/exposiciones.
4. **Contrafactual causal:** No es causal sin supuestos e identificación; aquí solo sensibilidad.
5. **Qué significa aditividad:** Base más contribuciones reproduce la predicción.

## Registros de artefactos / Artifactory

**Qué es, finalidad y elección:** Almacenan y distribuyen paquetes e imágenes versionados.

**Funcionamiento interno:** Demo PEP 503 simple index y OCI Distribution: wheel por versión, imagen por digest, SHA y etiquetas OCI.

**Aplicación y estado:** Se ha publicado, recuperado e instalado el wheel y ejecutado la imagen en CI.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/fa2fc34ed6146faec36e48e5e6ad4bf7ec58fd3b/infrastructure/artifacts/verify.sh). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/fa2fc34ed6146faec36e48e5e6ad4bf7ec58fd3b/infrastructure/artifacts/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46134222435).

**Limitaciones y alternativas:** No se ha utilizado JFrog Artifactory ni Artifact Registry. Alternativas Nexus, devpi, GHCR y registros gestionados.

**ES:** Verificamos integridad y procedencia entre commit, paquete e imagen mediante hashes.

**EN:** We verify package and image integrity and provenance using hashes.

### Preguntas de entrevista

1. **Tag vs digest:** Tag mutable; digest identifica contenido.
2. **Wheel vs sdist:** Wheel es distribución construida; sdist contiene fuente.
3. **Qué es provenance:** Relación verificable entre fuente, build y artefacto.
4. **Qué añade Artifactory:** Repositorios virtuales/remotos, políticas, permisos, promoción e integraciones.
5. **Experiencia directa:** No; esta es una demostración con alternativas gratuitas.

## GitHub Actions

**Qué es, finalidad y elección:** Automatización CI/CD basada en eventos, jobs, runners y artefactos.

**Funcionamiento interno:** Workflows con permisos mínimos, concurrencia, tests, build y smoke; PRs aisladas y evidencias en logs.

**Aplicación y estado:** CI real de API, gateway, LSTM, Airflow, Alibi, Kubernetes y artefactos.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/.github/workflows/llm-gateway-ci.yml). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/README.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46137957980).

**Limitaciones y alternativas:** CI verde no equivale a producción; las PR siguen abiertas. Alternativas GitLab CI, Jenkins, Cloud Build.

**ES:** CI ejecuta validaciones reproducibles y conserva evidencia antes de fusionar.

**EN:** CI executes repeatable checks and retains evidence before merging.

### Preguntas de entrevista

1. **CI vs CD:** Integración y validación frente a entrega/despliegue.
2. **Permisos mínimos:** Token de lectura cuando no hace falta escritura.
3. **Artifact vs cache:** Evidencia/producto de build frente a aceleración de dependencias.
4. **Concurrency:** Evita ejecuciones simultáneas incompatibles del mismo ámbito.
5. **Quality gate:** Bloquea publicación si fallan contratos, pruebas o controles.

## BigQuery

**Qué es, finalidad y elección:** Almacén analítico serverless columnar; SQL para métricas y datasets.

**Funcionamiento interno:** Carga batch NDJSON, esquema tipado y agregación por scope, día, proyecto y modelo. Sandbox sin facturación, no streaming.

**Aplicación y estado:** Exportación real del gateway y contrato offline; no se ha creado ni consultado un proyecto BigQuery.

**Código:** [fichero principal](https://github.com/idealab2026/idealab2026.github.io/blob/7d3dd5437e356c0abf98a219bcfdc09b5adb871e/infrastructure/gateway/cloud/bigquery.sql). **Reproducción:** [comandos y configuración](https://github.com/idealab2026/idealab2026.github.io/blob/7d3dd5437e356c0abf98a219bcfdc09b5adb871e/infrastructure/gateway/cloud/SANDBOX_RUNBOOK.md). **Evidencia:** [CI](https://github.com/idealab2026/idealab2026.github.io/actions/runs/46138329664).

**Limitaciones y alternativas:** Prueba SQL local no es ejecución BigQuery. Sandbox tiene cuotas y caducidad; no usar credenciales personales. Alternativas DuckDB, ClickHouse, Snowflake.

**ES:** Preparamos métricas anonimizadas para carga batch y consultas agregadas en un sandbox sin facturación.

**EN:** We prepare content-free telemetry for batch loading and aggregate SQL in a billing-disabled sandbox.

### Preguntas de entrevista

1. **Data warehouse vs OLTP:** Analítica columnar de grandes scans frente a transacciones pequeñas.
2. **Particionado:** Limita datos escaneados al filtrar por columna de partición.
3. **Clustering:** Ordenación física para reducir lectura por filtros frecuentes.
4. **Sandbox vs Free Tier:** Sandbox sin facturación y funciones limitadas; Free Tier normalmente requiere billing.
5. **Qué falta:** Proyecto institucional billing-disabled, carga y query verificada.

## GCP: arquitectura preparada, no desplegada

[Runbook y condiciones de gratuidad](https://github.com/idealab2026/idealab2026.github.io/blob/59221f2de096b2638f8e415f0e13722c3a05b537/infrastructure/gateway/cloud/README.md). [Sandbox BigQuery](https://github.com/idealab2026/idealab2026.github.io/blob/7d3dd5437e356c0abf98a219bcfdc09b5adb871e/infrastructure/gateway/cloud/SANDBOX_RUNBOOK.md).

| Servicio | Qué aporta y qué falta |
|---|---|
| Cloud Run | Contenedores serverless; API de investigación tiene manifiesto preparado. El gateway precisa destinos accesibles/autenticados, almacenamiento durable compartido y autorización de costes. No desplegado. |
| Cloud Storage | Objetos y datasets versionados; usar bucket privado con permisos por objeto. No activado. |
| Artifact Registry | Repositorio gestionado de imágenes y paquetes; requiere IAM y presupuesto. El demo OCI local no es este servicio. |
| Cloud Logging | Recoge stdout JSON, consultas y alertas; no hay ingestión cloud. |
| IAM | Identidades, roles y bindings de mínimo privilegio; app keys actuales no son IAM. No se crearon roles. |
| Vertex AI / Gemini Enterprise Agent Platform | Model Garden, endpoints, registro y pipelines gestionados; inferencia generalmente facturable. Estudiado, no integrado. |
| GKE | Kubernetes gestionado; el crédito de gestión no cubre cómputo. kind local, no GKE. |

**Preguntas GCP:** 1. ¿Cloud Run escala a cero? Sí con min instances=0; cold start y costes adicionales siguen posibles. 2. ¿Cómo accede un servicio a otro? Identidad de servicio, token de identidad y permiso invoker, no claves en frontend. 3. ¿Por qué separar Artifact Registry y Storage? Imágenes OCI/paquetes frente a objetos/datasets. 4. ¿Cómo evitar costes? Confirmar billing-disabled para Sandbox; no activar servicios que requieren facturación sin autorización. 5. ¿GKE frente a Cloud Run? Kubernetes gestionado con control de clúster frente a ejecución serverless de contenedores.

## Coordinación con asistentes públicos

Codex conserva los ficheros MIDAS AI, memoria, RAG híbrido, embeddings y LangChain, comparación de cuantización y benchmark de calidad. No se integran automáticamente. La API local /v1/models y /v1/prompts/active puede utilizarse desde clientes de confianza con credenciales distintas por aplicación. El navegador no debe recibir ninguna clave de gateway. La inferencia WebGPU permanece independiente y no genera automáticamente datos centrales. En caso de integración posterior, usar una revisión de contratos específica, consentimiento/privacidad, telemetría browser etiquetada como no confiable, protección contra abuso y benchmark mínimo de 30 preguntas. No copiar los prompts del lab encima de versiones locales de Codex; comparar diffs y acordar aprobación.

## Execution status

Prior evidence inventory: [PR 518](https://github.com/idealab2026/idealab2026.github.io/pull/518). New gateway [PR 519](https://github.com/idealab2026/idealab2026.github.io/pull/519), architecture/Kubernetes [PR 520](https://github.com/idealab2026/idealab2026.github.io/pull/520), LSTM resource/custody [PR 521](https://github.com/idealab2026/idealab2026.github.io/pull/521), BigQuery contract [PR 522](https://github.com/idealab2026/idealab2026.github.io/pull/522). No merges or publication while private coordinator state is unavailable.