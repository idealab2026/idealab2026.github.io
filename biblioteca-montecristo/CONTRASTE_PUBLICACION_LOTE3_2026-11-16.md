# Biblioteca IDEA LAB · tercer lote editorial · 16/11/2026

## Resultado y límite de la revisión

Los **99 PNG originales que ya había entregado el propietario** han podido recuperarse y abrirse en esta sesión: 69 de los dos primeros ZIP y 30 del exportador privado posterior. Ninguno necesita generarse de nuevo para continuar el trabajo. El índice público contiene **4 imágenes publicadas** al preparar este informe (#86, #88, #38 y #91).

Se ha realizado una segunda revisión visual ampliada de los capítulos de Montecristo seleccionados y se ha cotejado su secuencia principal, nombres, fechas y cantidades con la [edición francesa de Dumas](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo). Los dictámenes siguientes **no equivalen** a reproducir y cotejar íntegramente el audio de los vídeos; la colección de NotebookLM sigue siendo privada.

## Cinco originales aprobados para el siguiente lote de publicación

| Issue | Capítulo | Video ID | SHA-256 exacto original | Resultado |
|---|---:|---|---|---|
| [#78](https://github.com/idealab2026/idealab2026.github.io/issues/78) | 36 | `ad_Fubdb8Wg` | `75cdb9ad5f23c58f07e4360707a259c75c264b3c9e8ad32c368d717ce1d8486d` | **Aprobada para publicación** |
| [#79](https://github.com/idealab2026/idealab2026.github.io/issues/79) | 37 | `1e4_ju3mts8` | `7e49b8f8e85264a80230a23a7fa3a4f4a8622aa29c508e07161e7c24d6ce0b0b` | **Aprobada para publicación** |
| [#81](https://github.com/idealab2026/idealab2026.github.io/issues/81) | 39 | `yhuEsRLHNBQ` | `8e16b50958aa034fd1dd263a02a78f71571f6d472c3330488c773ce70f1ac7c1` | **Aprobada para publicación** |
| [#83](https://github.com/idealab2026/idealab2026.github.io/issues/83) | 41 | `bIqWWEoC5EI` | `f2dfd044cfb35856440312572b83a47f21e68cddfd140ddfeadabce9577edc89` | **Aprobada para publicación** |
| [#84](https://github.com/idealab2026/idealab2026.github.io/issues/84) | 42 | `gUoRDOSaxw0` | `82a889d7b392c1f291f3e966f60c04abc46b75a3c512705df6e860f2be2362fc` | **Aprobada para publicación** |

### Contraste de cada capítulo

- **#78 / 36:** del patíbulo al carnaval romano, ramilletes desde un balcón, palco en el teatro, señal de cinta rosa en San-Giacomo, carreras, *moccoletti* y final del carnaval. [Fuente primaria](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_36).
- **#79 / 37:** secuestro de Albert, exigencia de 4.000 piastras, intervención del conde, Vampa leyendo los *Comentarios* de César, rescate en las catacumbas y regreso al baile. [Fuente primaria](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_37).
- **#81 / 39:** almuerzo convocado el 21 de mayo a las 10:30, relato del rescate de Château-Renaud por Maximilien Morrel el 5 de septiembre, especulaciones de los convidados y puntualidad del conde. [Fuente primaria](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_39).
- **#83 / 41:** destreza del conde para identificar cuadros, retrato catalán de Mercédès, heráldica de los Morcerf, choque con Fernand y reacción de Mercédès. [Fuente primaria](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_41).
- **#84 / 42:** llegada a Champs-Élysées, tarjeta enviada a Danglars, compra de la finca a ciegas, Rue de la Fontaine nº 28, palidez de Bertuccio, libreta y viaje a Auteuil. [Fuente primaria](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_42).

Los cinco originales se han inspeccionado visualmente a tamaño ampliado; los cuerpos de texto de estas cinco láminas son legibles, sin errores manifiestos de pseudopalabras en la pasada realizada. No se reproducen documentos, credenciales ni fuentes privadas. Las ilustraciones generadas no muestran reproducciones de terceros identificadas en esta revisión, sin que esto constituya una certificación completa de derechos.

## Dos nuevos problemas encontrados: no publicar estos PNG

- **#75, capítulo 33:** escribe «Aito» donde la novela trata de **Rita**, además de «puntoría» en lugar de *puntería*. La narración principal de Vampa coincide parcialmente, pero la lámina debe corregirse. [Capítulo 33](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_33).
- **#80, capítulo 38:** muestra `número velotiste` en la dirección del conde y repite textos. El original exige `Rue du Helder, 27`; corregir la inscripción antes de aprobar. [Capítulo 38](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_38).

## Publicación técnica

Se registra la autorización estricta en [`APROBADAS_PARA_PR_LOTE3_2026-11-16.json`](./APROBADAS_PARA_PR_LOTE3_2026-11-16.json) y se prepara [`scripts/notebooklm_publicar_lote3.py`](../scripts/notebooklm_publicar_lote3.py). El ejecutor local solo admite los **cinco PNG con SHA-256 exacto**, valida los vídeos contra `catalogo.json`, excluye duplicados ya publicados y comprueba que el diff contiene exclusivamente esos PNG y `infografias/index.json`. Usa correo GitHub `noreply` para evitar el error GH007.

**Estado en esta sesión: 5 originales aprobados y listos para publicación; todavía no subidos.** Los originales están disponibles tanto en los ZIP adjuntos a ChatGPT como en la carpeta privada del Mac, pero el conector GitHub utilizado aquí no acepta subir directamente bytes desde el contenedor de conversación. La publicación requiere ejecutar el publicador en el Mac donde está el clon/autenticación; `--publish` prepara, sube, crea y fusiona PR si supera las comprobaciones, sin generar nuevas infografías ni gastar créditos de Codex.

**Sapiens:** los 22 originales descargados siguen necesitando una revisión semántica capítulo por capítulo; la inspección preliminar detectó pseudoescritura, cifras discutibles o afirmaciones insuficientemente atribuidas. **No autorizada publicación masiva ni nuevos reintentos de generación**.
