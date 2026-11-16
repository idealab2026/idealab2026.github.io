# Continuación de auditoría y publicación · 16/11/2026

## Resultado operativo

La web **ya incorpora #86 (capítulo 44) y #88 (capítulo 46)**. El índice público contiene **2 PNG**, comprobados contra GitHub en esta revisión. La PR #331 de Codex está abierta y documenta otros cinco contrastes; **no incluye imágenes ni está fusionada**.

Este documento distingue claramente aprobación editorial de publicación efectiva.

## Segundo lote autorizado: 2 PNG adicionales (solo PR)

| Issue | Capítulo | SHA-256 del PNG original (Mac) | Video ID | Dictamen |
|---|---|---|---|---|
| [#38](https://github.com/idealab2026/idealab2026.github.io/issues/38) | 59, *El testamento* | `8ef394264a18df82783fe52484478bf8e6aeac2be1cba31c5f90ce9cdb2b43b1` | `0tBaF1xSn_k` | **Aprobada para preparar PR** |
| [#91](https://github.com/idealab2026/idealab2026.github.io/issues/91) | 49, *Haydée* | `a95daca211db5d8f53ee5dab4dc10684001b1ffaab33f819255992342a6ebe79` | `M3m3Gsr4vKM` | **Aprobada para preparar PR** |

### Evidencia de contraste

- **#38:** Revisión de imagen completa y original de Dumas, [capítulo 59](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_59). Coinciden el sistema de respuesta de los ojos/diccionario, la suma de **900.000 francos** en títulos de renta, la decisión condicionada al matrimonio de Valentine con Franz y el destino hospitalario del legado. El dibujo simplifica que el efecto sobre los herederos depende del cumplimiento de esa condición, pero no altera el desenlace explicado.
- **#91:** Revisión de imagen completa y original de Dumas, [capítulo 49](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_49). Coinciden el apartamento con cuatro servidoras, la condición de libertad en Francia, la petición de reserva sobre el linaje, los tres sentimientos de Haydée, las evocaciones de Epiro/Pindo/Olimpo y la partida del conde hacia la familia Morrel. **Matices:** Dumas fija su edad como aproximadamente diecinueve o veinte años; «veinte» es una aproximación. El conde pide discreción, no una orden legal. Se admiten esos matices narrativos para una infografía divulgativa, sin convertirlos en citas literales.

Las dos imágenes corresponden a la obra literaria publicada, no a un cotejo exhaustivo de los vídeos. No se ha acreditado la licencia de todas las fuentes de los cuadernos privados; el lote contiene ilustraciones generadas, no reproducciones identificables de fuentes de terceros en la inspección visual. La autorización del titular comprende la publicación de infografías correctas. Los originales aprobados quedan anclados por su SHA exacto. **Aprobación para PR no implica que se hayan subido ni que estén publicadas.**

### Preparación técnica

- [`APROBADAS_PARA_PR_2026-11-16.json`](./APROBADAS_PARA_PR_2026-11-16.json) lista las únicas dos imágenes autorizadas en este lote y sus hashes.
- [`scripts/notebooklm_publicar_lote_aprobado.py`](../scripts/notebooklm_publicar_lote_aprobado.py) compara los originales locales con esos SHA-256, valida el mapa de vídeo y la cuenta GitHub IDEA LAB, elimina metadatos y prepara una **única PR** sin fusionarla automáticamente.
- No pueden subirse nuevas imágenes desde esta sesión porque los originales están en el Mac y GitHub no admite transferir los PNG privados mediante el conector actual. Se necesita una ejecución local del importador, **sin créditos de Codex**.

## Nuevos errores detectados al revisar originales antes de publicar

| Issue | Dictamen | Motivo |
|---|---|---|
| [#87](https://github.com/idealab2026/idealab2026.github.io/issues/87) · capítulo 45 | CORREGIR | «Benedetto abrasa a su madre adoptiva»: la [novela](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_45) relata que Benedetto y otros dos jóvenes torturan a Assunta y que las ropas se incendian en la lucha; el dibujo atribuye una acción directa de quema a Benedetto que simplifica incorrectamente el mecanismo y las responsabilidades |
| [#89](https://github.com/idealab2026/idealab2026.github.io/issues/89) · capítulo 47 | CORREGIR | «Trampa calculada en Auteuil»: la detención de los caballos ante la casa del conde se produce en **Champs-Élysées**, según el [capítulo 47](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_47). El detalle de los diamantes corresponde a los adornos del arnés, no a los cuerpos de los animales |
| [#90](https://github.com/idealab2026/idealab2026.github.io/issues/90) · capítulo 48 | BLOQUEADA | Error de nombre «Noirter» por **Noirtier** y rótulos lingüísticamente defectuosos («Dimensión del estudio humana», «La sombra de apoplejía»). Requiere regenerar/corregir y una nueva revisión integral |

## Estado al registrar este documento

- **99 PNG descargados y recibidos** según inventario.
- **2 publicados** (#86 y #88).
- **2 adicionales aprobados para PR** (#38 y #91).
- **95** imágenes restantes sin aprobar tras reservar los dos lotes.
- No se ha alterado el índice público con esta auditoría.
