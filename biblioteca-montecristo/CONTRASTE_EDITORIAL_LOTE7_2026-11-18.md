# Biblioteca de Montecristo — Lote 7 · auditoría editorial de ocho PNG

**18/11/2026.** Se abrieron ocho PNG originales (2752 × 1536 RGBA) del archivo `IDEA_LAB_LOTE7_REVISION_8PNG.zip`. Los ocho SHA-256 de exportación coinciden exactamente con su manifiesto. Todos están **pendientes de revisión audiovisual**, dado que no se ha cotejado el audio íntegro de YouTube. El siguiente contraste es respecto a la novela de Alexandre Dumas, edición de C. Lévy (1889), publicada en Wikisource.

| Issue | Capítulo | Dictamen | Discrepancia o confirmación |
|---|---:|---|---|
| [#27](https://github.com/idealab2026/idealab2026.github.io/issues/27) | 51 | **CORREGIR** | Noirtier se alegra por la condecoración de Maximilien, al que aún no conoce; no manifestar apoyo explícito al romance. |
| [#32](https://github.com/idealab2026/idealab2026.github.io/issues/32) | 53 | **AJUSTE MENOR** | Cinco títulos duplicados. La copa atribuida a Montecristo por Albert y el rechazo explícito de Eugénie necesitan presentación como atribución/inferencia, no hecho certificado. |
| [#33](https://github.com/idealab2026/idealab2026.github.io/issues/33) | 54 | **CORREGIR** | Montecristo interpreta el desagrado de Mercédès; ella no afirma directamente que desprecie el origen de los Danglars. La presentación de los Cavalcanti aún se anuncia, no se realiza en el capítulo. |
| [#35](https://github.com/idealab2026/idealab2026.github.io/issues/35) | 56 | **AJUSTE MENOR** | Buzoni debe ser Busoni. La cita de 26 de mayo, los 5.000 mensuales y 50.000 al falso padre sí figuran en Dumas. |
| [#36](https://github.com/idealab2026/idealab2026.github.io/issues/36) | 57 | **CORREGIR** | El recinto a lucerna no es traducción adecuada de L'enclos à la luzerne: usar El cercado de alfalfa. Distinguir rechazo íntimo del matrimonio de ruptura formal. |
| [#37](https://github.com/idealab2026/idealab2026.github.io/issues/37) | 58 | **CORREGIR IMPORTANTE** | Villefort dice antes de tres meses, no tres semanas. Código: cierra ojos = sí; parpadea repetidamente = no; mira al cielo = petición; cierra un ojo específico para llamar a Valentine o Barrois. |
| [#39](https://github.com/idealab2026/idealab2026.github.io/issues/39) | 60 | **APROBADA SIN CAMBIOS** | 900.000 francos, carta testamentaria ocular, preocupaciones de Villefort, consejo matrimonial del conde, temor por Auteuil y visita prevista al telégrafo de Châtillon están presentes. |
| [#51](https://github.com/idealab2026/idealab2026.github.io/issues/51) | 72 | **APROBADA SIN CAMBIOS** | Fallecimiento del marqués en el viaje, llegada de la marquesa, boda acelerada, afecto de Noirtier, forma blanca y vaso de naranjada; la visión se atribuye a la marquesa, no a una aparición demostrada. |

## Control de publicación

**APROBADAS sin modificar: #39 (cap. 60), #51 (cap. 72).** La imagen #39 presenta la intención de conocer el telégrafo, no su visita ya efectuada. La #51 presenta la visión de la marquesa como su relato, no como prueba objetiva de un fantasma.

| Issue | Video | SHA-256 original local | SHA-256 copia saneada aprobada |
|---|---|---|---|
| #39 | `hGf4PtrijvE` | `7d88219fb271fe4413c5ee223e56586d98f4b86d3584df82ee8fc0e7ce9acce1` | `b166717851f93bb7a7f58686e8dc90f95831d935c48e29ec5c6b22d56245fd41` |
| #51 | `BSoTWtrNVPc` | `486110e3af30e3212d827ef2b2a07b3aeb01238617226fda504fdd95e4b98232` | `9efda03c273670cd5885ee237f9d6aaa054012b87e272370b634a62480330bba` |

**BLOQUEADAS hasta corrección:** #27, #32, #33, #35, #36 y #37. El origen auditado no queda autorizado por superar SHA. Cualquier sustitución debe obtener **nuevo SHA y nuevo dictamen**. No se alteran las imágenes originales del ZIP.

Esta PR incorpora únicamente el dictamen, el manifiesto de aprobaciones y un publicador local. **No añade PNG nuevos al repositorio.** El catálogo público permanece en 33/99 hasta fusionar otra PR de imágenes y verificar GitHub Pages.

## Publicación desde el Mac del titular

Usar el ZIP de lote 7 original, en Descargas, sin descomprimir:

```bash
cd ~/Developer/idea-lab-web
git switch main
git pull --ff-only
python3 scripts/notebooklm_publicar_lote7_aprobadas.py --publish
```

El publicador solo admitirá los PNG #39 y #51 con SHA exportado exacto y origen auditado; verificará los ocho registros del manifiesto ZIP, rechazará artefactos inesperados y restringirá el diff a dos PNG e índice. Se requiere Git limpio y sesión `gh` autenticada. La PR de imágenes no se considera pública hasta verificar el despliegue Pages.

## Fuentes literarias primarias

- Capítulo 51: https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_51
- Capítulo 53: https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_53
- Capítulo 54: https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_54
- Capítulo 56: https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_56
- Capítulo 57: https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_57
- Capítulo 58: https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_58
- Capítulo 60: https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_60
- Capítulo 72: https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_72
