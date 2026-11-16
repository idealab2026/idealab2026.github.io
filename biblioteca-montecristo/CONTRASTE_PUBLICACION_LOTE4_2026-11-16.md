# Biblioteca IDEA LAB · revisión y publicación · lote 4 · 16/11/2026

## Resumen

Los **99 originales PNG** siguen disponibles en los ZIP aportados por el titular. El índice público de IDEA LAB contenía **9 infografías publicadas** al abrir esta revisión. Se ha completado la inspección visual individual y el cotejo de acontecimientos, nombres, cantidades y secuencias de los capítulos 31, 32, 35, 61 y 62 con la edición francesa pública de Alexandre Dumas. No se ha escuchado ni transcrito íntegramente el audio de los vídeos de Montecristo; es una aprobación de láminas divulgativas respecto de la novela, no un cotejo audiovisual exhaustivo.

## Cinco originales aprobados para publicación, sujetos a SHA exacto

| Incidencia | Capítulo | Video YouTube | SHA-256 original | Dictamen |
|---|---|---|---|---|
| #73 | 31, Italia · Simbad el Marino | `wiDqdxhIaDo` | `40e8102dc88d3a9a31f1fe66e2838a171b3ded55be4123bf0217930745937582` | APTA |
| #74 | 32, Despertar | `wRIkqNmfwzs` | `766f014ca6f2af2f970ede2d3a9714aba4a640061ad426ecb18d00231e605ba0` | APTA |
| #77 | 35, La mazzolata | `OxzEzRNIiAQ` | `0557c275a95b43782d2cee5167b4d118effd855e7f5d89619905ee18b3349de2` | APTA |
| #40 | 61, La trampa del telégrafo | `aOA7ZBcJHcE` | `0173e8934497339a60297b3e3c83dbb86878588e54469d8f74a53047800433e6` | APTA |
| #41 | 62, Los fantasmas | `oyU5tzmg5rk` | `5e5a0b7dffa338437797d22f1256664764f430504fde588c1a65d648667a4890` | APTA |

### Contraste por capítulo

- [31](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_31): desembarco en Montecristo, reconocimiento de contrabandistas por Gaetano, entrada vendada a la gruta, hospitalidad de Simbad y experiencia con hachís. La proclamación de justicia propia del anfitrión corresponde a su propio discurso en la obra, no a una afirmación editorial independiente.
- [32](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_32): Franz despierta en la cueva y busca su entrada secreta durante dos horas; Simbad saluda con un pañuelo a bordo de su yate, que se dirige a la costa corsa para desembarcar a dos bandoleros, antes de continuar hacia Málaga; llegada de Franz a Roma para el carnaval y falta de coches en la posada de Pastrini.
- [35](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_35): visión de Franz, Albert y el conde de la ejecución en Piazza del Popolo. El indulto corresponde a Peppino (Rocca Priori); Andrea **Rondolo** reacciona con furia a que no muera su compañero y acaba ejecutado mediante mazzolata. Los juicios de venganza/misantropía están atribuidos al conde.
- [61](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_61): conde soborna con 25.000 francos al telegrafista; falsa información sobre la huida de Don Carlos y levantamiento de Barcelona; Danglars dispone de seis millones de valores españoles; error corregido después por el *Moniteur*; efecto acumulado de un millón de francos entre pérdida y lucro cesante.
- [62](https://fr.wikisource.org/wiki/Le_Comte_de_Monte-Cristo/Chapitre_62): Bertuccio transforma el patio/interior en tres días; Morrel llega a caballo a las seis; baronesa pasa una nota a Debray; presentación como nobles de los Cavalcanti; el magistrado Villefort tiembla y Bertuccio reconoce a Hermine Danglars, Villefort vivo y Benedetto.

Las cinco imágenes examinadas no muestran defectos textuales evidentes a escala completa. Las ilustraciones representan escenas novelescas y no se atribuyen a testimonios históricos. No se ha realizado una auditoría universal de los materiales privados de NotebookLM ni de derechos de fuentes no reproducidas. La validación de la importación elimina metadatos auxiliares antes de copiar los PNG públicos.

## Exclusiones nuevas

| Incidencia | Motivo de rechazo provisional |
|---|---|
| **#76** · cap. 34 | El cartel ficticio de la ejecución muestra una fecha errónea («jueves 19 de febrero de 1838») y escritura de apariencia inventada: el capítulo 34 anuncia que las *tavolette* fijan **martes 22 de febrero**. Además, las etiquetas del cartel no son legibles. No reutilizar sin regenerar/editar. |
| **#82** · cap. 40 | La lámina presenta «Rescató a Morcerf exigiendo respeto mutuo tras perdonarle la vida» en un panel sobre Vampa; mezcla dos acciones diferentes: el conde había apresado y después liberado a Vampa bajo condición de respeto hacia él y los suyos, mientras que Albert Morcerf fue liberado de los bandidos en otro episodio. Reformular la relación. |
| **#70** · cap. 28 | El registro penitenciario ilustrado contiene pseudorótulos y escritura desfigurada; revisar la lámina a nivel de texto antes de publicación. |
| **#85** · cap. 43 | Maquetación con títulos repetidos y síntesis final adelantada; no se aprueba en este lote. |

## Procedimiento técnico preparado

[Manifiesto de aprobación](./APROBADAS_PARA_PR_LOTE4_2026-11-16.json) y [publicador](../scripts/notebooklm_publicar_lote4.py) referencian únicamente esos cinco issues y sus SHA-256 originales. El programa usa la identidad GitHub `noreply`, comprueba correspondencia con catálogo/estado local, coteja cada SHA antes de importar, limita el diff a los cinco PNG y `infografias/index.json`, y con `--publish` crea, sube y fusiona la PR. No genera nuevos gráficos ni utiliza créditos de Codex.

**Estado:** cinco nuevos originales preparados; **aún no integrados ni publicados**. No confundir el registro de aprobación con un despliegue de GitHub Pages completado.
