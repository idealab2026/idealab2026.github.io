# Biblioteca de Montecristo · Segunda pasada editorial del lote 5

**Corte:** 16/11/2026. Los 20 PNG previamente publicados no cambian con esta revisión.

Se reexaminaron cinco originales previamente rechazados. Se corrigieron sobre los PNG originales las **cuatro láminas #44, #50, #87 y #92**. Las modificaciones son tipográficas y locales: mantuvieron las dimensiones **2752 × 1536**, la transparencia PNG y todos los píxeles ajenos a las zonas de texto intervenidas; el ZIP de corrección lleva trazabilidad SHA-256.

| Issue | Capítulo | Corrección visual concreta | Fuente |
|---|---:|---|---|
| [#44](https://github.com/idealab2026/idealab2026.github.io/issues/44) | 65 | El total de 500.000 francos de Hermine incluye las ganancias de Haití (100.000), ferrocarriles (250.000) y deuda española (150.000) | [Dumas, 65](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_65) |
| [#50](https://github.com/idealab2026/idealab2026.github.io/issues/50) | 71 | El conde **perdona a Mercédès**, pero no a quienes los separaron | [Dumas, 71](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_71) |
| [#87](https://github.com/idealab2026/idealab2026.github.io/issues/87) | 45 | «Joyero Joannès» y la liberación de Bertuccio tras la confesión de Caderousse, con intervención de Busoni | [Dumas, 45](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_45) |
| [#92](https://github.com/idealab2026/idealab2026.github.io/issues/92) | 50 | La bolsa contiene un diamante **valorado en** 100.000 francos, y el conde plantea para luego descartar a lord Wilmore | [Dumas, 50](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_50) |

**#43 permanece bloqueada.** La ilustración original presenta una pistola sacada de su bolsillo. Una alternativa generada de nuevo introdujo otro episodio de agresión inexistente en el capítulo; no se publica ninguna de las dos. Hay que corregir tanto el dibujo como los pies y hacer una tercera revisión de su nuevo SHA antes de permitir publicación. [Dumas, capítulo 64](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_64).

La aprobación para las **cuatro versiones corregidas**, no sus originales, queda restringida a los hashes del [manifiesto](./APROBADAS_CORREGIDAS_LOTE5_2026-11-16.json). Las nuevas imágenes no están en GitHub hasta que el usuario importe el ZIP de manera autenticada desde su Mac.

## Publicación desde el Mac

1. Descargar **BBTK_MONT_LOTE5_4_CORRECCIONES_PARA_REVISION.zip** a la carpeta `~/Downloads`.
2. En la carpeta del repositorio actualizado, ejecutar:

```bash
git switch main
git pull --ff-only
python3 scripts/notebooklm_publicar_lote5_corregidas.py --publish
```

El script verifica la firma, dimensiones y SHA de cada PNG corregido; también contrasta su procedencia con los originales locales y la auditoría previa. **Solo permite añadir esos cuatro PNG y modificar el índice**, nunca el #43 ni el ZIP de procedencia.

**Límites:** no se ha cotejado todo el audio de los vídeos; la aprobación editorial se refiere a su correspondencia visible con la novela, no a una transcripción exhaustiva. La publicación efectiva solo se confirma después de que GitHub Pages complete el despliegue.

