# Puente NotebookLM ↔ IDEA LAB (Mac + GitHub)

## Objetivo y estado

Permite que una solicitud formulada en ChatGPT para una infografía de la Biblioteca
de Montecristo cree una incidencia GitHub mediante la cuenta IDEA LAB y que
un ejecutor **local** en el Mac utilice NotebookLM. No requiere Work ni Codex,
ni un servidor público, ni GitHub Actions self-hosted.

No significa que ChatGPT haya obtenido acceso directo a NotebookLM:
ChatGPT solo envía instrucciones PÚBLICAS de catálogo, con una gramática estricta.
Los identificadores de cuaderno y fuente, las cookies de Google, los PDFs,
las imágenes pendientes y el histórico de ejecución quedan exclusivamente
en el usuario local de macOS.

El puente no está en funcionamiento hasta instalarlo, autenticar ambas
herramientas y vincular al menos un cuaderno en el Mac. El proceso
launchd solo funciona con el Mac despierto y la sesión del usuario activa.

## Instalación inicial, una única vez

Requisitos: macOS, Homebrew, Git, Python 3 y GitHub CLI (gh). Ejecuta en
**Terminal del Mac**, no pegues tokens ni IDs privados en chats o incidencias.

1. Instalar el CLI mantenido por la comunidad, previamente revisando su
repositorio https://github.com/jacob-bd/gemini-notebook-mcp-cli y sus riesgos
(no es una API oficial de consumo; Google podría cambiar los endpoints):

    brew install uv gh
    uv tool install notebooklm-mcp-cli

Si ya están instalados, actualizar solamente cuando se desee:

    uv tool upgrade notebooklm-mcp-cli

2. Autenticar NotebookLM con la cuenta personal utilizada para los cuadernos,
y proteger las cookies en el llavero macOS (el llavero puede requerir interacción):

    nlm login
    nlm auth storage set protected
    nlm notebook list --title

3. Entrar en GitHub con la cuenta IDEA LAB, no con la cuenta personal. Si no
está iniciada, ejecutar gh auth login; usar GitHub.com y HTTPS:

    gh auth status
    gh auth switch -u idealab2026
    gh auth setup-git
    gh api user --jq .login

La última orden debe devolver exactamente idealab2026.

4. Clonar el repositorio público IDEA LAB en una carpeta exclusiva:

    mkdir -p ~/Developer
    gh repo clone idealab2026/idealab2026.github.io ~/Developer/idea-lab-web
    cd ~/Developer/idea-lab-web

Si ya existía un clon, entrar en él y actualizarlo con git pull --ff-only.
No utilizar el repositorio personal para esta integración.

5. Verificar conexión y activar el puente para **incidencias nuevas**:

    python3 scripts/notebooklm_bridge.py doctor
    python3 scripts/notebooklm_bridge.py init

6. Asociar cuadernos (SOLO en el Mac). El comando anterior de notebook list
mostrará los IDs de tus propios cuadernos.

Para El conde de Montecristo, dos cuadernos:

    python3 scripts/notebooklm_bridge.py map-book --book conde-montecristo --volume tomo-i --notebook-id UUID_DEL_CUADERNO_I
    python3 scripts/notebooklm_bridge.py map-book --book conde-montecristo --volume tomo-ii --notebook-id UUID_DEL_CUADERNO_II

Para un libro con un único cuaderno:

    python3 scripts/notebooklm_bridge.py map-book --book sapiens --notebook-id UUID_DE_SAPIENS

Importante: no enviar a ChatGPT las credenciales ni los IDs de fuentes;
se almacenan localmente en ~/.config/idea-lab/notebooklm-bridge.json,
con permisos de propietario 0600.

Para un episodio concreto se deben seleccionar SOLO sus fuentes exactas.
Consultar la lista local con:

    nlm source list UUID_DEL_CUADERNO --json

Y asociar el ID del vídeo, el cuaderno y los IDs de las fuentes concretas:

    python3 scripts/notebooklm_bridge.py map-episode --book conde-montecristo --video-id ID_VIDEO_YOUTUBE --notebook-id UUID_DEL_CUADERNO --source-ids ID_FUENTE_1,ID_FUENTE_2

Nunca generar una infografía de un solo capítulo a partir de todos los PDFs
si no está definida esta correspondencia.

7. Probar manualmente el servicio de sondeo:

    python3 scripts/notebooklm_bridge.py poll
    python3 scripts/notebooklm_bridge.py status

Para dejarlo instalado con periodicidad de 3 minutos, mientras el Mac esté
encendido y desbloqueado:

    python3 scripts/notebooklm_bridge_launchd.py install

Para desactivarlo cuando lo desees:

    python3 scripts/notebooklm_bridge_launchd.py remove

Los logs están en ~/Library/Logs/IDEA-LAB/ y la cola local en
~/.local/state/idea-lab/notebooklm-bridge.json, ambas privadas de macOS.

## Correspondencia exacta con la lista de YouTube (obligatoria por episodio)

**La unidad de generación es el vídeo de YouTube.** En esta lista algunos
vídeos cubren varios capítulos (por ejemplo, 1–5), y otros un solo capítulo
(51, 53, 54, etc.). El vídeo y la infografía comparten un ID de YouTube.

Las imágenes de *tomo I* o *tomo II* son resúmenes generales: **no son**
infografías de ningún capítulo y no deben figurar en las fichas de episodios.

El catálogo recuperado actualmente tiene 51 vídeos de *Montecristo*, con
saltos en los capítulos 31 y 52 y dos vídeos etiquetados 34. Esto es una
limitación del catálogo disponible, no una confirmación de ausencia en la
lista original. Nunca debemos rellenar huecos inventando vídeos.

Antes de generar, inspeccionar y asociar las **fuentes concretas** del
cuaderno (estas órdenes no publican IDs privados):

    cd ~/Developer/idea-lab-web
    git pull --ff-only
    python3 scripts/notebooklm_source_mapper.py --book conde-montecristo --volume tomo-i
    python3 scripts/notebooklm_source_mapper.py --book conde-montecristo --volume tomo-ii

Si el informe muestra asociaciones inequívocas, guardarlas localmente:

    python3 scripts/notebooklm_source_mapper.py --book conde-montecristo --volume tomo-i --apply
    python3 scripts/notebooklm_source_mapper.py --book conde-montecristo --volume tomo-ii --apply

La herramienta también reconoce de forma estricta PDFs numerados, como
`51.pdf`, `52.pdf`, ..., `100.pdf`: cada archivo se vincula exclusivamente
con su capítulo homónimo, sin interpretar la posición en el listado.

La herramienta solo vincula cuando encuentra una fuente con URL idéntica a
la del vídeo, una fuente del capítulo exacto (incluido `51.pdf`) o un conjunto
completo de fuentes para el intervalo. **Nunca** asigna un PDF del tomo completo
a un solo capítulo. Si hay ambigüedad, informa PENDIENTE y exige
selección manual de fuentes mediante `map-episode`.

Ejemplo de solicitud **por vídeo**, capítulo 51 (no resumen del tomo):

    <!-- IDEA_LAB_NLM_REQUEST_V1
    {"version":1,"action":"infographic","book":"conde-montecristo","video_id":"oVMG6QzBK64","volume":null}
    -->

En cada PNG que revisemos, el encabezado debe identificar el capítulo real
del vídeo. No publicar una lámina que mezcle sucesos de otros capítulos
con independencia de que NotebookLM la haya generado.

## Solicitar desde ChatGPT

Usuario: "Utiliza el NotebookLM de El conde de Montecristo, tomo I, para
generar una infografía y prepararla para la web".

ChatGPT conectado a GitHub IDEA LAB crea una incidencia NUEVA en
idealab2026/idealab2026.github.io, usando esta plantilla EXACTA de cuerpo,
sin escribir IDs privados:

    <!-- IDEA_LAB_NLM_REQUEST_V1
    {"version":1,"action":"infographic","book":"conde-montecristo","video_id":null,"volume":"tomo-i"}
    -->

Se requiere título con prefijo [NLM] y autor de GitHub idealab2026.
No acepta prompts arbitrarios, órdenes de terminal, URLs ni accesos a
otros proyectos. La solicitud es pública: solo debe incluir slug, ID de vídeo
publicado en YouTube o identificador de tomo.

El ejecutor local rechaza solicitudes de otras cuentas y entradas
desconocidas. No se ejecuta código remoto ni contenido de las incidencias.

## Descarga, revisión y publicación

El sondeo local pide la generación a NotebookLM; la generación puede tardar.
Después consulta Studio para encontrar el artefacto nuevo y descargarlo
en ~/Pictures/IDEA-LAB/NotebookLM/Pendientes/issue-N.png.

Si hubiera varios artefactos nuevos y no fuera inequívoco, consultar en Mac:

    nlm studio status UUID_DEL_CUADERNO --json --full
    python3 scripts/notebooklm_bridge.py attach --issue N --artifact-id UUID_ARTIFACTO

No reenvía una solicitud que pudiera haberse completado para no consumir
duplicadamente la cuota.

Una vez descargada, revisar calidad, autoría, imágenes, textos, exactitud y
posibles datos personales. La imagen no se publica hasta ejecutar:

    python3 scripts/notebooklm_bridge.py publish --issue N --confirm-public

Esto incorpora el PNG al sitio, crea una rama y abre un PR de IDEA LAB. El PR
puede revisarse y fusionarse mediante el conector GitHub de ChatGPT; la web
se desplegará a través del workflow existente. El PR es público, por eso
se exige revisión ANTES de subir el PNG. Los cuadernos y fuentes no se incluyen.

## Seguridad, cuotas y límites

- El software nlm es un cliente comunitario no oficial. Puede dejar de
  funcionar cuando cambie la web de Google. Verificar regularmente su origen.
- Solo se aceptan peticiones en el catálogo público procedentes de idealab2026.
  Comprometer esa cuenta permitiría solicitar generaciones, pero NO ejecutar
  comandos arbitrarios ni publicar PNG sin aprobación local.
- La cola pública no admite consultas privadas a NotebookLM. Para preguntar
  sobre textos y devolver respuestas privadas a ChatGPT habría que montar
  un canal privado distinto, no publicar resultados como comentario de GitHub.
- La cuenta Google puede aplicar límites de uso. Sin cuota, la generación fallará.
- Las credenciales protegidas por Keychain pueden requerir desbloqueo. La sesión
  de Google puede caducar y necesitar nlm login / nlm auth refresh.
- El Mac apagado o dormido deja las peticiones pendientes; no hay ningún servicio
  externo de ejecución ni costes de servidor.
- Nunca instalar un runner GitHub Actions dentro de un repositorio público;
  GitHub desaconseja hacerlo por riesgo de ejecutar código no confiable.

## Diagnóstico de fallos sin consumir cuota (noviembre de 2026)

Antes de reintentar una solicitud que aparece como `failed`, mantener el
LaunchAgent desactivado y ejecutar estas comprobaciones **de solo lectura**
desde el Terminal interactivo del Mac:

```bash
cd ~/Developer/idea-lab-web
git pull --ff-only
python3 scripts/notebooklm_bridge.py health
python3 scripts/notebooklm_bridge.py diagnose-failed --issue 163
python3 scripts/notebooklm_bridge.py diagnose-failed --issue 178
python3 scripts/notebooklm_audit_failed.py --issue 163 --issue 178
```

Para conciliar trabajos previamente enviados sin iniciar nuevas generaciones,
se puede ejecutar, en un segundo paso, `python3 scripts/notebooklm_bridge.py reconcile-only`.
Este comando **no es estrictamente de solo lectura**: puede descargar PNG,
actualizar el estado local y sincronizar comentarios de GitHub.

El auditor nuevo comprueba que las fuentes seleccionadas permanecen accesibles
en el cuaderno correcto, que su numeración coincide con el capítulo (si puede
deducirse inequívocamente), qué estados ofrecen las fuentes y si Studio conserva
el artefacto fallido. Solo muestra recuentos y conclusiones: nunca publica
nombres, IDs de cuaderno/fuente, rutas privadas ni mensajes crudos del CLI.

**Una fuente presente no garantiza que la generación vaya a completarse.**
Tampoco un error genérico de Studio demuestra que se haya agotado la cuota.
Sin confirmar la causa y la ausencia de artefactos tardíos, no activar
`retry-failed`, `resume-generations` ni ejecutar `poll`.

El catálogo incluye dos vídeos etiquetados «Capítulo 34» de *Montecristo*
(con distintos IDs de YouTube). Ambos deben conservar solicitudes diferentes
y revisarse contra sus fuentes reales, sin deduplicarlos por el título.

## Continuación controlada con fallos confirmados (11/11/2026)

Los diagnósticos locales de #105, #139, #140, #142, #145, #147, #148,
#150, #163 y #178 localizaron las fuentes vinculadas y los artefactos
`failed`; Studio no comunicó el motivo técnico. El indicador de origen
`unknown` de las fuentes **no demuestra que estén dañadas**. El libro
*Libertad o igualdad* acumula siete fallos confirmados. No reiniciar
`resume-generations` ni reintentar estos trabajos a ciegas.

Con un trabajo `failed` en el estado privado, `poll` ahora bloquea
**nuevas generaciones automáticas**. Puede seguir conciliando y descargando
las previamente enviadas. La solicitud #201 se mantiene expresamente
retenida incluso si no queda ningún fallo.

Se ha añadido `poll-safe`: modo puntual, con libros permitidos explícitos,
que excluye los cuadernos que tengan trabajos `failed`, `uncertain` o
`deferred`. También comprueba trabajos todavía activos y reintentos
programados; conserva el contador de los últimos cinco resultados y el
umbral de pausa de tres. Sin `--execute`, solo muestra la siguiente
solicitud elegible, sin modificar estado ni enviar nada.

Desde una sesión interactiva del Mac, **manteniendo desinstalado launchd**:

```bash
cd ~/Developer/idea-lab-web
git pull --ff-only
python3 scripts/test_notebooklm_bridge.py -q
python3 -m unittest discover -s scripts -p 'test_notebooklm_poll_safe.py' -q
python3 scripts/notebooklm_bridge.py health
python3 scripts/notebooklm_bridge.py poll-safe --book sapiens --book conde-montecristo
```

Para realizar **un único envío**, solo después de verificar el número
mostrado y el estado de NotebookLM, ejecutar:

```bash
python3 scripts/notebooklm_bridge.py poll-safe --book sapiens --book conde-montecristo --execute
```

El comando no abre una cola desatendida, no reintenta trabajos fallidos y
nunca envía la #201. Usa el mismo `request_new` del puente con
instantánea Studio, comprobación de comentarios GitHub e idempotencia.
Después del envío, conciliar la generación sin lanzar otra:

```bash
python3 scripts/notebooklm_bridge.py reconcile-only
python3 scripts/notebooklm_bridge.py health
```

No ejecutar `poll` en bucle ni instalar launchd hasta confirmar que el
piloto se ha completado y descargado sin fallo. Ante cualquier envío
`uncertain`, consultar `audit-blocked` antes de una recuperación.

## Si poll-safe indica «Sin solicitud apta»

No ejecutar inmediatamente `--execute` otra vez. La cola puede no tener
ningún candidato por motivos diferentes: solicitud ya registrada en el Mac,
fecha anterior a la activación local, fuente exacta todavía sin vincular,
cuaderno en cuarentena o retención explícita de #201.

Desde la sesión interactiva del Mac, consultar el desglose de solo lectura:

```bash
cd ~/Developer/idea-lab-web
git pull --ff-only
python3 scripts/notebooklm_bridge.py poll-safe --book sapiens --book conde-montecristo --diagnose
```

Se ofrecen recuentos por libro y fase, sin imprimir IDs de cuadernos ni de
fuentes privadas. Si el motivo es `unmapped`, diagnosticar las asociaciones
inequívocas con `python3 scripts/notebooklm_map_catalog.py` y, para
Montecristo, con `python3 scripts/notebooklm_source_mapper.py --book
conde-montecristo --volume tomo-i` (repetir para tomo-ii). Esos
comandos no guardan nada sin `--apply`.

Si el motivo es `before-activation`, **no manipular la fecha local ni
reinicializar el puente**: hay que contrastar las incidencias contra el
historial de envío y el estado remoto antes de adoptar trabajos antiguos.

## Auditoría por libro de solicitudes aplazadas

Si `poll-safe --diagnose` señala cuadernos en cuarentena, consultar todos
los trabajos `uncertain` y `deferred` de un conjunto de libros en una sola
operación **sin generar infografías y sin modificar el estado**:

```bash
cd ~/Developer/idea-lab-web
git pull --ff-only
python3 scripts/notebooklm_bridge.py blocked
python3 scripts/notebooklm_bridge.py audit-blocked --book sapiens --book conde-montecristo
```

El auditor contrasta las instantáneas anteriores con los artefactos actuales
de NotebookLM Studio. Reporta por número de incidencia si aparecieron nuevas
infografías, si no las hay o si la instantánea es incompleta. No revela IDs
privados ni vincula automáticamente un artefacto a un capítulo. Si el cuaderno
tiene varios trabajos aplazados, un mismo artefacto podría corresponder a
cualquiera de ellos; no atribuirlo por mera posición u orden de aparición.

- **Con candidatos nuevos:** no reintentar. Revisar en Studio la identidad del
  capítulo, el contenido y la correspondencia antes de usar `attach`.
- **Sin candidatos:** no significa que NotebookLM no vaya a entregar un
  artefacto tardío. No activar reintentos sin comprobar además la cuota y el
  historial de envíos.
- **Instantánea no verificable:** cuarentena intacta; resolver discrepancias
  del inventario de Studio antes de cualquier envío.

Mantener retenida la solicitud #201 y los libros con fallos confirmados.

## Preflight individual antes de intentar recuperar los tres bloqueos

La auditoría del 11/11/2026 mostró cero artefactos posteriores a la
instantánea para #41 (Montecristo II), #85 (Montecristo I) y #115 (Sapiens).
Esto **no demuestra** que las solicitudes que acabaron en `deferred` no se
enviaran a NotebookLM ni que el servicio haya recuperado la cuota.

Existe un control de solo lectura, solicitud a solicitud:

```bash
cd ~/Developer/idea-lab-web
git pull --ff-only
python3 scripts/notebooklm_bridge.py recovery-preflight --issue 115
python3 scripts/notebooklm_bridge.py recovery-preflight --issue 41
python3 scripts/notebooklm_bridge.py recovery-preflight --issue 85
```

Comprueba ausencia de envíos confirmados en GitHub, consistencia de
mapeos privados, exclusión de otros trabajos no conciliados del mismo
cuaderno, ausencia de artefactos nuevos e inexistencia de artefactos
incompletos o de estado desconocido. No cambia ningún archivo local,
estado o comentario; no consume cuota de generaciones.

**Aunque muestre «Controles superados», no autoriza por sí solo un nuevo
envío.** Antes de usar `recover-blocked` hay que confirmar de forma
independiente que NotebookLM dispone de cuota y que el intento anterior
no sigue en ejecución. `recover-blocked` exige confirmaciones explícitas
y bloquea además artefactos antiguos todavía en curso. Preferir un único
piloto por vez; nunca eliminar o marcar como descargadas las incidencias
aplazadas para abrir la cola.

## Diagnóstico de una generación enviada pero todavía sin descargar

Si `reconcile-only` repite `#115 sapiens submitted`, no lanzar de nuevo
`recover-blocked` ni usar `retry-failed`: el envío original ya consta
registrado. Para distinguir los estados visibles de Studio, ejecutar:

```bash
cd ~/Developer/idea-lab-web
git pull --ff-only
python3 scripts/notebooklm_bridge.py inspect-submitted --issue 115
```

La inspección es de **solo lectura** y comprueba el inventario actual frente
a la instantánea anterior al envío. Puede informar cero candidatos nuevos,
un candidato finalizado, un fallo confirmado, un candidato todavía en
curso, varios candidatos ambiguos o una instantánea incompleta. Si existe
un solo candidato finalizado, `reconcile-only` intentará descargarlo y
validará el PNG; si hay varios candidatos, no se atribuye ninguno sin una
comprobación editorial inequívoca. No se muestran identificadores de
cuadernos ni artefactos privados. El inventario de Studio no demuestra por
sí solo que un trabajo se esté ejecutando activamente.
