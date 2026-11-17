# Biblioteca de Montecristo — lote 7: auditoría de ocho originales

Preparación: 17/11/2026.

## Selección

El manifiesto público contiene 33/99 infografías. Se han seleccionado ocho capítulos del tomo II que no aparecen publicados, con triaje histórico relativamente favorable. PENDIENTE DE CONTRASTE no significa aprobado; AJUSTE OPCIONAL tampoco.

| Issue | Capítulo | Vídeo | Triaje histórico |
|---|---:|---|---|
| #27 | 51 | oVMG6QzBK64 | PENDIENTE DE CONTRASTE |
| #32 | 53 | FkAIE4ypFaI | AJUSTE OPCIONAL |
| #33 | 54 | WNTSHJFOPfA | PENDIENTE DE CONTRASTE |
| #35 | 56 | upSoJolzqUk | PENDIENTE DE CONTRASTE |
| #36 | 57 | 3YFtBdqwa1A | PENDIENTE DE CONTRASTE |
| #37 | 58 | NkQsH2Lb6pE | PENDIENTE DE CONTRASTE |
| #39 | 60 | hGf4PtrijvE | PENDIENTE DE CONTRASTE |
| #51 | 72 | BSoTWtrNVPc | PENDIENTE DE CONTRASTE |

La identidad de cada vídeo se ha cotejado con la solicitud GitHub, el catálogo y el índice. Detalle: [Candidatas del lote 7](./CANDIDATAS_LOTE7_2026-11-17.json).

## Protocolo estricto

En este lote no disponemos en el repositorio de los SHA-256 originales históricos. No se inventan. El exportador exige: (a) un original local issue-N.png respaldado por estado privado del puente, con mismo issue, libro y vídeo, o (b) un ZIP histórico con MANIFIESTO_QA.json que atribuya cada issue, vídeo y SHA.

Se comprueban integridad y firma del PNG, dimensiones, ausencia de publicación previa, coincidencia de hashes si existe manifiesto original, identidad unívoca y ausencia de duplicados. El ZIP resultante contiene solo los ocho PNG saneados y un manifiesto con SHA original y de exportación. No incluye cookies, rutas personales ni estado privado; nunca se sube automáticamente. Si falta cualquier archivo, la exportación se cancela sin paquete parcial.

## Ejecutar en el Mac

~~~
cd ~/Developer/idea-lab-web
git switch main
git pull --ff-only
python3 scripts/notebooklm_revisar_lote7.py --export-zip
~~~

El resultado será ~/Downloads/IDEA_LAB_LOTE7_REVISION_8PNG.zip.

Si faltan originales en Pendientes, se puede señalar el ZIP de QA histórico con identidad verificable:

~~~
python3 scripts/notebooklm_revisar_lote7.py --source-zip ~/Desktop/IDEA_LAB_PNG_pendientes_QA.zip --export-zip
~~~

Si los archivos originales solo están en un ZIP sin manifiesto o no consta identidad en el estado privado, no podrán aprobarse por el simple nombre de archivo. La imagen puede contener información sensible impresa en píxeles, que el saneamiento de metadatos no elimina. Revisarla antes de adjuntar.

## Próximo hito

Contrastar los ocho PNG recibidos con los capítulos de Dumas y sus personajes, rótulos, cifras, cronología y atribuciones. Documentar correcciones y aprobar únicamente la versión exacta por SHA. No se ha cotejado el audio íntegro de los vídeos.
