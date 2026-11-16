# Biblioteca de Montecristo · preflight de candidatas · lote 5 · 16/11/2026

## Qué se ha completado

Se han identificado **ocho originales no publicados** del lote recibido el 15/11/2026 y comprobado su correspondencia con las solicitudes de GitHub y el índice público. Se han localizado los capítulos equivalentes en la edición francesa de Alexandre Dumas, y se han documentado los puntos concretos a contrastar. Los SHA-256 que figuran aquí proceden del inventario privado anterior, **no** de una nueva lectura de los binarios.

**Limitación material:** los archivos ZIP están identificados en la Biblioteca privada del usuario, pero la exportación de sus bytes no ha estado disponible para esta ejecución. Por ello, **ningún PNG nuevo ha sido inspeccionado a tamaño completo, aprobado o publicado**. El preflight local comprobará ese extremo en el Mac, donde sí están los originales, sin transferir PNG ni metadatos privados a GitHub.

## Ocho candidatos, no aprobaciones

| Issue | Capítulo | Título | Foco del cotejo | Fuente |
|---|---:|---|---|---|
| [#43](https://github.com/idealab2026/idealab2026.github.io/issues/43) | 64 | El mendigo | Andrea/Benedetto y Caderousse: identidades y secuencia | [Dumas 64](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_64) |
| [#44](https://github.com/idealab2026/idealab2026.github.io/issues/44) | 65 | Escena conyugal | 500.000 / 700.000 / 175.000 francos; pérdidas y repartos | [Dumas 65](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_65) |
| [#46](https://github.com/idealab2026/idealab2026.github.io/issues/46) | 67 | El despacho del procurador del rey | Hermine, Villefort, el jardín de Auteuil y el niño | [Dumas 67](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_67) |
| [#50](https://github.com/idealab2026/idealab2026.github.io/issues/50) | 71 | El pan y la sal | Mercédès y Montecristo en el invernadero; diálogo y simbolismo | [Dumas 71](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_71) |
| [#87](https://github.com/idealab2026/idealab2026.github.io/issues/87) | 45 | La lluvia de sangre | Joyero, Caderousse y La Carconte; no confundir personajes | [Dumas 45](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_45) |
| [#89](https://github.com/idealab2026/idealab2026.github.io/issues/89) | 47 | El tiro de caballos tordos | Caballos, rescate, nombres y secuencia narrativa | [Dumas 47](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_47) |
| [#90](https://github.com/idealab2026/idealab2026.github.io/issues/90) | 48 | Ideología | Opiniones de los personajes sobre justicia, poder y castigo | [Dumas 48](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_48) |
| [#92](https://github.com/idealab2026/idealab2026.github.io/issues/92) | 50 | La familia Morrel | Lord Wilmore y la identidad oculta de Dantès | [Dumas 50](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_50) |

Detalles operativos legibles por máquina en [CANDIDATAS_LOTE5_2026-11-16.json](./CANDIDATAS_LOTE5_2026-11-16.json).

## Preflight sin consumo de créditos

Desde el Mac, en la carpeta `~/Developer/idea-lab-web`, ejecutar:

```bash
git switch main
git pull --ff-only
python3 scripts/notebooklm_revisar_lote5.py
```

El comando comprueba ocho hashes, presencia de PNG, referencia al catálogo, estado local de descarga y ausencia de publicación previa; después genera un **visor HTML privado** en `~/Downloads/IDEA_LAB_QA_LOTE5.html` con las imágenes originales, las incidencias y los puntos a contrastar.

No modifica ninguna imagen, no crea PR, no consume créditos de Codex y **no aprueba nada**. La revisión de ortografía, cifras, personajes, cronología, spoilers, licencia y privacidad sigue siendo humana/editorial. Solo cuando exista aprobación individual documentada por issue y SHA exacto podrá prepararse un publicador análogo al lote 4.

Los ZIP privados, las cookies y el estado local del bridge no deben incluirse en el repositorio.
