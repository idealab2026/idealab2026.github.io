# BBTK MONT · lote 6 · preflight de ocho originales (16/11/2026)

## Selección

Se ha comprobado que estos **ocho vídeos no figuran en el índice público** al abrir el lote 6. Se priorizan correcciones conocidas del *Conde de Montecristo* frente a introducir otro gran lote sin contraste previo.

| Issue | Capítulo | Estado de triaje histórico | Prioridad de revisión |
|---|---:|---|---|
| #42 | 63 | CORREGIR | «Villefost» por «Villefort» |
| #45 | 66 | CORREGIR | Pseudoescritura en documento de Janina |
| #47 | 68 | CORREGIR | Frase deformada sobre promesa matrimonial |
| #48 | 69 | CORREGIR | Titular pseudoescrito de periódico |
| #49 | 70 | BLOQUEADA | «Merrel» y segundo nombre ilegible |
| #68 | 26 | CORREGIR | «Antigno sastre» |
| #69 | 27 | CORREGIR | «Ruina del» duplicado y truncado |
| #85 | 43 | AJUSTE OPCIONAL | Encabezados redundantes y contraste narrativo |

El estado de triaje es **histórico y provisional**. La selección no implica aprobación ni permiso de publicación. Los SHA-256 exactos y los vídeos canónicos constan en [CANDIDATAS_LOTE6_2026-11-16.json](./CANDIDATAS_LOTE6_2026-11-16.json).

## Exportar las imágenes privadas para revisión

Desde el Mac, con el repositorio en main:

~~~bash
cd ~/Developer/idea-lab-web
git switch main
git pull --ff-only
python3 scripts/notebooklm_revisar_lote6.py --export-zip
~~~

Se genera **~/Downloads/IDEA_LAB_LOTE6_REVISION_8PNG.zip**. Adjuntar el ZIP en la conversación para examinar las ocho láminas a resolución original y contrastar el texto con Dumas.

El programa lee únicamente ocho PNG de ~/Pictures/IDEA-LAB/NotebookLM/Pendientes, comprueba los SHA-256 con el inventario histórico, la firma PNG, el catálogo y el índice público, y elimina los metadatos auxiliares *de la copia exportada*. No altera los originales ni el estado privado del puente.

### Si los originales antiguos no están en Pendientes

Utilizar **--source-zip** con el ZIP privado original que ya está guardado en el Mac (los archivos deben conservar el nombre issue-N.png). Ejemplo:

~~~bash
python3 scripts/notebooklm_revisar_lote6.py --source-zip ~/Desktop/IDEA_LAB_PNG_pendientes_QA.zip --export-zip
~~~

Otra alternativa es **--source-dir** para señalar una carpeta local de PNG issue-N.png. El programa rechaza ficheros ambiguos, enlaces simbólicos, hashes distintos, vídeos ya publicados y paquetes incompletos. No incorpora secretos ni rutas privadas en el ZIP resultante.

**Siguiente hito:** revisar manualmente los ocho originales, distinguir reparaciones puntuales de láminas que necesiten regeneración integral y registrar por issue el SHA-256 de cada versión finalmente aprobada. Solo después podrá prepararse un publicador separado.
