# Infografías de NotebookLM · Biblioteca de Montecristo

Esta web usa PNG de NotebookLM solo después de generarlos con fuentes específicas, revisarlos y publicarlos. Si no existe PNG, aparece el esquema anterior señalado como provisional.

Privacidad: no publicar identificadores de cuaderno, archivos originales, fuentes integrales, cuentas personales ni credenciales. Únicamente el PNG revisado y el índice público de imágenes.

## Generación local en Mac

Requiere nlm autenticado. Identificar el cuaderno y las fuentes:

    nlm notebook list
    nlm source list NOTEBOOK_ID --json

Si se requiere autenticación, ejecutar nlm login.

Infografía del libro (en una obra dividida en varios cuadernos, nunca afirmar que un solo tomo cubre toda la obra):

    python3 scripts/notebooklm_infografias.py generate --book conde-montecristo --notebook-id NOTEBOOK_ID --execute

Infografía de un episodio, seleccionando solo los PDFs correspondientes (varios si el vídeo agrupa capítulos):

    python3 scripts/notebooklm_infografias.py generate --book conde-montecristo --video-id YOUTUBE_VIDEO_ID --notebook-id NOTEBOOK_ID --source-ids SOURCE_ID_1,SOURCE_ID_2 --execute

El CLI solicita un gráfico en español, estilo editorial y orientación horizontal. La generación puede ser asíncrona. Revisar en Studio antes de descargar:

    nlm studio status NOTEBOOK_ID
    python3 scripts/notebooklm_infografias.py download --book conde-montecristo --video-id YOUTUBE_VIDEO_ID --notebook-id NOTEBOOK_ID --artifact-id ARTIFACT_ID --output ~/Downloads/capitulo.png

IMPORTANTE: el comando download NO publica. Revisar la precisión, legibilidad, narrativa, posibles spoilers y que ninguna información privada figure en la imagen.

Importar tras revisar (confirmación explícita de que la imagen es apta para publicación):

    python3 scripts/notebooklm_infografias.py import --book conde-montecristo --video-id YOUTUBE_VIDEO_ID --png ~/Downloads/capitulo.png --confirm-public

Para una obra completa se omite --video-id en download e import. Si el libro
está dividido en cuadernos (por ejemplo, los dos tomos de Montecristo), NO se
debe importar una infografía de un tomo como si resumiera la obra completa.
En su lugar, importar los dos PNG por separado:

    python3 scripts/notebooklm_infografias.py import --book conde-montecristo --volume tomo-i --png ~/Downloads/tomo-i.png --confirm-public
    python3 scripts/notebooklm_infografias.py import --book conde-montecristo --volume tomo-ii --png ~/Downloads/tomo-ii.png --confirm-public

La web mostrará ambos tomos en la ficha del libro, claramente diferenciados.
Cuando exista una síntesis realmente completa, podrá incorporarse como imagen
del libro entero. El importador comprueba el PNG, retira metadatos auxiliares y escribe su ruta bajo biblioteca-montecristo/infografias/ con la entrada correspondiente en infografias/index.json. Solo después de revisar el git diff se puede crear un commit y subir las imágenes.

## Criterios editoriales

1. Libro completo: mapa de tesis, personajes, estructura y relaciones en el conjunto de la obra. Los tomos necesitan un tratamiento separado o una síntesis que cubra realmente ambos.
2. Episodio: solo contenido de sus fuentes concretas; el vídeo puede contener uno o varios capítulos.
3. Nunca inventar datos o citas. Evaluar los gráficos antes de publicarlos; NotebookLM puede generar errores.
4. Conservar fuentes originales y cuadernos en privado. Publicar únicamente las imágenes seleccionadas, nunca el PDF íntegro.
5. Las imágenes PNG serán descargables y ampliables desde la web, sin costes de alojamiento añadidos.
