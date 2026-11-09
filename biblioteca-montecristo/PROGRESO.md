# Seguimiento de infografías · Biblioteca de Montecristo

## Fuente de verdad

Una fila **por vídeo de YouTube** del catálogo público, no por página, PDF o
posición inventada. El vídeo “Cap. 1 a 5” tiene una sola fila; los vídeos
individuales tienen una fila por capítulo.

La tabla pública está en `/biblioteca-montecristo/progreso.html`.
`scripts/build_biblioteca_progress.py` crea `progreso.json` en el
despliegue de GitHub Pages. **No se edita manualmente un estado NotebookLM.**

### Dos fases, con evidencia

1. **NotebookLM**: una incidencia GitHub `[NLM]` del vídeo fue creada por
   `idealab2026`. “En cola” indica solicitud pendiente; “Generándose”
   indica que el ejecutor del Mac notificó el envío. **“Generada”** requiere
   el comentario de confirmación de *descarga del PNG en el Mac* emitido por
   el puente con la cuenta IDEA LAB. Una captura, una solicitud o una
   generación incierta no cuentan como terminadas.
2. **ChatGPT**: una infografía solo está **“Corregida”** si hay un archivo
   corregido **real**, revisado y registrado explícitamente en
   `progreso-corregidas.json`. Los PNG originales no cuentan como
   corregidos por el hecho de haberse descargado o publicado.

Primero completamos todas las infografías originales correspondientes a los
vídeos catalogados; después corregimos una a una, respetando el número y la
estructura de cada vídeo. Los resúmenes generales de libros/tomos se muestran
aparte y no aumentan el contador de episodios.

## Registrar una corrección real

1. Revisar la infografía original y las fuentes del capítulo.
2. Corregir texto, nombres, puntuación y coherencia, preferentemente
   maquetando texto verdadero en SVG en vez de dibujar letras en un PNG.
3. Colocar la versión definitiva revisada en
   `biblioteca-montecristo/infografias/corregidas/VIDEO_ID.svg` o `.png`.
   Debe ser una imagen real y visible; no colocar rutas o estados inventados.
4. Añadir a `progreso-corregidas.json` una entrada con esta forma:

       {
         "version": 1,
         "videos": {
           "oVMG6QzBK64": {
             "verified": true,
             "source": "chatgpt",
             "reviewed_at": "2026-11-09",
             "image": "./infografias/corregidas/oVMG6QzBK64.svg"
           }
         }
       }

5. Revisar y fusionar los dos archivos. GitHub Pages regenerará la tabla;
   el contador **no** sube si el archivo no existe o el registro no es
   válido. El ejemplo anterior es ilustrativo, **no un capítulo completado**.

## Sincronización y privacidad

La publicación de GitHub Pages se ejecuta en cambios de `main`, de forma
programada y ante nuevas solicitudes o comentarios de **la cuenta IDEA LAB**
en incidencias `[NLM]`. El progreso toma exclusivamente información
**pública** de GitHub y del catálogo de YouTube. No necesita credenciales
personales ni acceso al Mac desde GitHub Actions; ningún PDF o cuaderno de
NotebookLM se copia al repositorio.

Si la API pública de GitHub falla, se informa **“Sin verificar”** en vez de
atribuir por defecto un estado de no generación. La fecha de la última
sincronización aparece en la página. El botón «Actualizar» recarga el último
JSON desplegado; no ejecuta NotebookLM ni fuerza la descarga en el Mac.
