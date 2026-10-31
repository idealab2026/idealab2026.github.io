# IDEA LAB · Estadísticas corporativas

## Arquitectura

El apartado **Estadísticas** de la web corporativa muestra cifras agregadas de tres productos públicos:
- España en Datos (ruta `/dashboard-gobierno/`)
- MIDAS (ruta `/laboratorio-cuantitativo/`)
- Psicohistoria (ruta `/sistemas-complejos/`)

Las webs ya usan el mismo Web Analytics de **Cloudflare de IDEA LAB**. No se consulta ni se requiere ninguna cuenta ajena, y no se utiliza D1, Worker, correo, GitHub o infraestructura personal.

**Este apartado es público.** Solo incluirá cantidades de visitas/páginas vistas, periodos y nombres de los productos. No publicar fuentes completas, tokens, referrers individuales, direcciones IP, usuarios, geolocalización individual ni registros crudos. Si se requiere un panel privado, GitHub Pages por sí solo no implementa autenticación.

El navegador consulta solo el archivo `/data/traffic.json` generado durante el despliegue. **Nunca** llama directamente a la API de Cloudflare.

## Activación de estadísticas reales

Este repositorio tiene programado un GitHub Actions diario que construye un resumen agregado. El primer despliegue **no tiene acceso a Cloudflare**; la interfaz muestra «Sin datos» sin fingir cifras.

Para autorizar únicamente una lectura desde la **cuenta IDEA LAB**:

1. En Cloudflare de IDEA LAB, abrir **Account API Tokens → Create Token → Custom token**.
2. Permiso exclusivamente **Account → Account Analytics → Read**, limitado a la cuenta de IDEA LAB. No conceder Zone Edit, Workers Edit, DNS Edit, Billing o permisos administrativos.
3. Localizar el **Account ID** de la misma cuenta (32 caracteres hexadecimales). No utilizar el identificador de una cuenta distinta.
4. En GitHub de **idealab2026/idealab2026.github.io → Settings → Secrets and variables → Actions**, añadir **solo allí**, nunca en archivos, chat o código:
   - `IDEALAB_CF_ANALYTICS_TOKEN`: token Cloudflare solo de lectura.
   - `IDEALAB_CF_ACCOUNT_ID`: ID de la cuenta IDEA LAB.
5. En **Actions → Publicar web corporativa IDEA LAB → Run workflow**, iniciar una ejecución manual o esperar a la diaria (05:27 UTC).
6. Comprobar que `scripts/build_traffic.py` generó un archivo con `status: verified` y que GitHub Pages publicó la nueva versión.
7. Verificar las cifras frente al informe Cloudflare antes de usar datos para análisis público.

La API GraphQL de Web Analytics podría tener limitaciones del plan gratuito o del conjunto de datos disponible. **Si responde con un error, el job falla y la web previamente publicada permanece intacta**. No contratar ningún plan de pago para habilitar esta conexión sin una decisión expresa. Si la API no está disponible, se podrá habilitar una exportación manual validada mediante un proceso específico, no una simulación.

## Metodología y límites

- La extracción usa `rumPageloadEventsAdaptiveGroups`, filtra por `requestHost` y segmenta por prefijos de ruta públicos.
- Solo procesa ventanas de hasta 30 días UTC desde la fecha real de instrumentación; no rellena fechas previas.
- Se almacenan exclusivamente `day`, identificador público del producto, `visits` y `pageViews`.
- Se rechazan grupos truncados, datos muestreados que requieren extrapolación, respuestas con errores o conteos inválidos.
- Las cifras son visitas **registradas por el proveedor**, no visitantes únicos ni todas las visitas reales: bloqueadores, robots, muestreo y restricciones de captura pueden afectar los datos.
- **No podemos medir clics internos ni desgloses del Sankey con este servicio**; requeriría otra instrumentación.
- El resumen está incluido en el artefacto de GitHub Pages, **no se comitean tokens ni snapshots reales a Git**. El archivo del repositorio refleja el estado sin conexión.
- Si no hay conexión válida, aparece **Sin datos**, nunca un cero no verificado.

Fuentes: https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/ y https://developers.cloudflare.com/web-analytics/faq/.
