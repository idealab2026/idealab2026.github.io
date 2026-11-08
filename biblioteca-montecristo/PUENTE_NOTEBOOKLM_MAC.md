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
