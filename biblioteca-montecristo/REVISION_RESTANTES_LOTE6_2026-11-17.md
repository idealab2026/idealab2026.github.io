# Biblioteca de Montecristo · Segunda pasada, lote 6 · cinco correcciones

**Fecha de corte:** 17/11/2026. Esta revisión abarca exclusivamente los originales #45, #47, #48, #49 y #68 recibidos en el ZIP privado del lote 6.

La integridad de los cinco PNG originales se verificó contra el manifiesto de exportación. Se corrigieron rótulos y texto incrustado en ilustraciones sobre copias independientes. Los cinco PNG corregidos conservan resolución **2752 × 1536**, el mismo canal alfa y no tienen metadatos auxiliares; los cambios RGB permanecen localizados en los campos tipográficos. Los SHA-256 finales constan en [el manifiesto de aprobaciones](./APROBADAS_RESTANTES_LOTE6_2026-11-17.json).

## Correcciones y fuentes

| Issue | Cap. | Rectificación realizada | Fuente primaria |
|---|---:|---|---|
| [#45](https://github.com/idealab2026/idealab2026.github.io/issues/45) | 66 | Capital de segundo orden de alrededor de **50 millones**, no 40; título y procedencia del nombre Morcerf matizados; pergamino de Janina con nombres legibles | [Dumas 66](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_66) |
| [#47](https://github.com/idealab2026/idealab2026.github.io/issues/47) | 68 | Franz no retira la palabra dada; el baile está **anunciado**; Bertuccio comunica una visita al Palacio sin confirmar un encuentro tripartito; Normandía: **buscar**, no comprar, una finca | [Dumas 68](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_68) |
| [#48](https://github.com/idealab2026/idealab2026.github.io/issues/48) | 69 | Busoni recibe a un **enviado policial**, no a Villefort; se identifican como versiones los relatos de Busoni y Wilmore; documento de investigación legible | [Dumas 69](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_69) |
| [#49](https://github.com/idealab2026/idealab2026.github.io/issues/49) | 70 | Corrección de **Morrel** y los **nomeolvides**; banqueros **Franck y Poulmann**; Danglars había abonado efectos por **200.000 francos** | [Dumas 70](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_70) |
| [#68](https://github.com/idealab2026/idealab2026.github.io/issues/68) | 26 | «**Antiguo sastre**» y contextualización de lo que Caderousse sospecha o insinúa sobre sus antiguos amigos, sin adelantar la narración detallada del capítulo 27 | [Dumas 26](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_26) |

**Alcance de la aprobación:** correspondencia sustantiva de las afirmaciones visibles con la novela. Las escenas que representan acontecimientos futuros o simbolismos no deben interpretarse como acontecimientos ya consumados. No se ha cotejado el audio íntegro de YouTube; el manuscrito no es una transcripción del vídeo.

## Control de publicación

Las cinco correcciones son independientes de los originales rechazados; cada archivo tiene un **nuevo SHA-256**. El script `scripts/notebooklm_publicar_lote6_restantes.py` permite crear una PR restringida a **exactamente cinco PNG y el índice** después de comprobar el ZIP privado y los hashes aprobados.

Guardar `BBTK_MONT_LOTE6_5_CORRECCIONES_REVISADAS.zip` en `~/Downloads`, sin descomprimir, y ejecutar tras sincronizar `main`:

```bash
cd ~/Developer/idea-lab-web
git switch main
git pull --ff-only
python3 scripts/notebooklm_publicar_lote6_restantes.py --publish
```

El programa verifica el paquete, evita sobreescribir capítulos ya publicados, crea la PR y la fusiona. La publicación efectiva requiere comprobar por separado GitHub Pages. **Recuento previo a esta operación: 28/99; objetivo al finalizar Pages: 33/99.**
