# Biblioteca de Montecristo · Capítulo 64 · corrección de la infografía #43

## Dictamen del 16/11/2026

La versión corregida procede del original **de seis escenas** (2752 × 1536), no de las alternativas generativas de siete viñetas que inventaban una agresión.

Se corrigieron tres errores del original:

1. **Panel 5, ilustración**: la pistola estaba visible en manos de Andrea, pero Dumas indica que permanece dentro de su bolsillo. Se sustituyó el segmento incompatible por un **detalle editorial simbólico del bolsillo**, con el rótulo «Gesto oculto». El cuchillo de Caderousse sí permanece representado.
2. **Panel 5, pie**: «Andrea palpa su pistola oculta. Caderousse abre un cuchillo.» Ambos gestos ocurren a escondidas y no desembocan en una agresión.
3. **Panel 6, pie**: «Toma el sombrero de Andrea y la capa del criado para pasar.» Caderousse se disfraza para cruzar la barrera sin sospechas; no describirlo simplemente como un robo.

**Fuente primaria:** https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_64 (pasaje del bolsillo, cuchillo y prendas).

## Evidencia técnica

- SHA-256 del original descargado: bfaa2aa4a051a5d40264681fab5048ca5fcae6a04052c79c2d34dfe28e6fb1d9
- SHA-256 del original exportado: 1e12a4a4d029cc512da3ce5ae54c54b62667f5c2e51fd757f6240e576c52ce6f
- **SHA-256 del PNG corregido autorizado:** 8c00bf1313fa0f58b331dc97bc588df485a531478b6a702fec342224e1f3de47
- Dimensiones conservadas: 2752 × 1536. Canal alfa original preservado.
- Porcentaje de píxeles RGB modificados: 2,06 %, únicamente en el detalle de viñeta 5 y los dos pies corregidos.
- PNG sin bloques de metadatos auxiliares. La intervención pictórica es una **ilustración de detalle**, no un acontecimiento adicional de la novela.

La aprobación se refiere a su coherencia visual con el texto original. **No** se ha cotejado el audio íntegro del vídeo del canal. Esta aprobación **NO** habilita ni el PNG inicial ni las alternativas que inventaban escenas.

## Importación desde el Mac

Descargar el ZIP privado BBTK_MONT_CAP64_ISSUE43_CORRECCION.zip y colocarlo en la carpeta Descargas, sin extraer. Con el repositorio actualizado:

    cd ~/Developer/idea-lab-web
    git switch main
    git pull --ff-only
    python3 scripts/notebooklm_publicar_43_corregida.py --publish

El publicador revisa la firma PNG y los tres SHA, confirma la solicitud original, impide duplicados y limita la PR a la nueva imagen y al índice de infografías. Pages debe comprobarse por separado después de fusionar.
