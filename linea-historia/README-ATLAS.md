# Atlas visual de Línea de la Historia

## Implementación
- Cronología sincronizada con el panel de mapas según el **año central visible** del viewport horizontal.
- Al seleccionar un registro de imperio, persona o acontecimiento, el panel **fija su contexto** hasta pulsar **Soltar**.
- Pestaña **Atlas visual** con deslizador de eras, entrada numérica de año, imágenes disponibles, miniaturas y registros contemporáneos; admite pantalla completa.
- El atlas utiliza **instantáneas cartográficas**, no fronteras históricas reconstruidas de forma continua.
- Se conservan la pestaña Mapamundi (fronteras actuales), la vista por columnas y los filtros existentes.

### Catálogos
- `atlas-examples.json`: mapas publicados de Wikimedia Commons con créditos, año representado, ventana de consulta y fuente.
- `atlas-imported.json`: opcional y no publicado mientras sus fuentes permanezcan sin revisar. Se genera junto a `atlas-media/` a partir de `HISTORIA.xlsx`.

Esquema mínimo:
```json
{
  "version": 1,
  "items": [
    {
      "id": "roman-117",
      "title": "Imperio romano, 117 d. C.",
      "src": "./atlas-media/roman-117.webp",
      "asOf": 117,
      "start": 100,
      "end": 130,
      "eventIds": ["h-KR34"],
      "hints": ["imperio romano"],
      "sourceUrl": "https://commons.wikimedia.org/wiki/File:RomanEmpire_117_es.svg",
      "credit": "ArdadN y Nachosan · dominio público",
      "needsReview": false
    }
  ]
}
```

`asOf` es la fecha exacta **representada por la imagen**. `start` y `end` sirven solo para descubrirla; **no significan** que las fronteras coincidan en todos esos años.

Si `asOf: null`, la imagen se coloca en **Imágenes originales pendientes de catalogar**, sin atribuirle arbitrariamente un año.

### Importación desde Excel
Se recuperaron 81 ilustraciones ancladas en la pestaña `LÍNEA TEMPORAL` del libro original (82 en total). La copia comprimida con metadatos, extractor Python, imágenes WebP y archivo de procedencia se ha preparado **fuera del repositorio público**.

Antes de subir el ZIP: **verificar copyright/atribución de cada imagen**. La presencia en un Excel privado no concede licencia para publicar en GitHub Pages. En particular, no publicar imágenes con marca de agua ni autoría desconocida sin permiso o licencia suficiente.

Una vez autorizados los materiales, descomprimir el paquete en la raíz del repositorio y subir `linea-historia/atlas-imported.json` y `linea-historia/atlas-media/`. No se necesita servidor de pago.

### Comprobaciones de aceptación
1. Abrir Línea temporal, ir al año 117, ver un mapa de Roma etiquetado **117 d. C.**
2. Arrastrar la cronología; el contexto visual debe cambiar, sin perder filtros y categorías.
3. Abrir la franja de `IMPERIO ROMANO`; el atlas debe quedar fijado hasta pulsar `Soltar`.
4. Entrar en `Atlas visual`, mover el deslizador y usar las flechas de mapa anterior/siguiente.
5. Pulsar un acontecimiento contemporáneo: se abre la misma ficha lateral existente.
6. Activar y desactivar Pantalla completa y comprobar escritorio y móvil.
7. Si se importa el Excel, comprobar que las 75 imágenes sin datar se muestran solo en la galería editorial y no en el año 0.

## Revisión de las 81 imágenes incrustadas — 16/11/2026

Se revisaron las 81 imágenes de la pestaña `LÍNEA TEMPORAL` del Excel personal. La tabla pública `atlas-inventory.json` incluye la celda de origen, temática observada, fecha explícita cuando existe y estado de reutilización. **No publica el contenido binario de las imágenes originales**, ya que el Excel no prueba su licencia.

Se identificaron seis ilustraciones con fecha explícita. Se publican **mapas alternativos de Wikimedia Commons**, con fecha, autores y licencia de cada alternativa en `atlas-examples.json`, manteniendo la referencia a la imagen del Excel:
- image3.png · KF71 · República romana, 44 a. C. → `commons-roman-republic-44`.
- image4.jpg · JC57 · Guerra del Peloponeso, 431 a. C. → `commons-peloponnesian-431`.
- image5.png · LI67 · Imperio romano, 117 d. C. → `commons-rome-117` (existente).
- image28.png · JK58 · Alejandro Magno, c. 323 a. C. → `commons-alexander-323`.
- image30.png · JT57 · Segunda guerra púnica, 218 a. C. → `commons-punic-218`.
- image68.png · LH98 · Año de los cuatro emperadores, 69 d. C. → `commons-roman-69`.

El resto —75 imágenes— tiene catalogación por tema pero no fecha acreditada. Entre ellas se encuentran capturas de terceros, infografías, genealogías y gráficos científicos. **image38.png, AO8, muestra una marca de agua comercial**; no publicarla sin licencia de Shutterstock u otra autorización válida. Los mapas originales pueden también tener derechos de autor, incluso si estaban almacenados en el Excel privado.

Se mantiene accesible el paquete original optimizado y su informe privado para revisión. Para publicar un original, se debe documentar como mínimo fuente exacta, autor, licencia/permiso, atribución y fecha histórica que representa. Si tiene licencia libre verificable, se incorpora a `atlas-imported.json` más el archivo correspondiente en `atlas-media/`, y se añade expresamente al workflow de Pages tras una comprobación de derechos.

**Esta fase publica el inventario completo y seis alternativas de las imágenes fechadas, no los 81 originales del archivo.**

## Banda de contexto visual sincronizada (noviembre de 2026)

Se ha añadido una **banda visible de ilustraciones** dentro de la pestaña **Línea temporal**, inmediatamente encima del eje horizontal, y la sección equivalente **Gráficos y diagramas de la época** en el Atlas visual.

- Al mover la cronología se actualizan hasta tres ilustraciones asociadas al **año central visible**.
- Al pulsar un acontecimiento o una franja se priorizan sus diagramas temáticos y el contexto queda fijado; el control `Soltar registro` restablece el seguimiento del desplazamiento.
- Las ilustraciones se pueden ampliar sin abandonar la cronología, con acceso a la fuente y licencia exactas.
- Se puede ocultar la banda para ganar espacio. El cambio de pestaña conserva filtros y registros.
- Las imágenes se presentan **fuera** del eje de escala, porque insertar miniaturas arbitrariamente en un eje de cientos de millones de años crearía solapes y distorsiones.
- `atlas-context.json` almacena ventanas de **relevancia pedagógica**, no supuestas fronteras históricas exactas.

Las cinco láminas públicas y sus equivalencias editoriales son:

| Lámina libre | Celda(s) originales | Origen y licencia |
|---|---|---|
| Reloj del tiempo geológico | C11 / T9 | Woudloper, Hardwigg, PePeEfe · Wikimedia Commons · dominio público |
| Escala estratigráfica | C11 / T9 | FLerouge · Wikimedia Commons · CC BY-SA 4.0 |
| Migraciones humanas prehistóricas | BD52 / BC11 | Continentalis · Wikimedia Commons · CC BY-SA 3.0 |
| Dryas Reciente, temperaturas de Groenlandia | BR18 | USGS y Osetnik · Wikimedia Commons · dominio público |
| Expansión de la agricultura neolítica | CK48 / GP5 | Atlasabierto · Wikimedia Commons · CC BY 4.0 |

**Importante:** estas láminas son obras distintas y reutilizables que desempeñan la misma función explicativa que las imágenes del Excel; no son reproducción de sus capturas originales. El inventario de 81 originales permanece intacto con sus referencias de celdas y estado de derechos. En gráficos paleoclimáticos, se distingue el dato proxy de Groenlandia de la temperatura media global.
