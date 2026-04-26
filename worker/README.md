# Worker proxy OpenAI

Worker de Cloudflare que recibe imágenes desde `calorias.html` y llama a GPT-4o-mini, manteniendo la API key fuera del cliente. Esto permite desplegar el sitio en GitHub Pages sin exponer la key.

## Setup (una vez)

1. Crea cuenta gratis en [dash.cloudflare.com](https://dash.cloudflare.com).
   - Plan free: **100k requests/día** y **10ms CPU/request**, más que suficiente.

2. Instala Wrangler (CLI oficial de Cloudflare):
   ```sh
   npm install -g wrangler
   ```

3. Login en tu navegador:
   ```sh
   wrangler login
   ```

4. Desde esta carpeta, guarda tu key de OpenAI como secret cifrado:
   ```sh
   cd worker
   wrangler secret put OPENAI_KEY
   ```
   Wrangler te pedirá la key — pega tu `sk-proj-...` y enter. Queda cifrada en Cloudflare, no en el repo.

5. Deploy:
   ```sh
   wrangler deploy
   ```
   Output: `https://deporte-calorias-proxy.<tu-usuario>.workers.dev`. Copia esa URL.

## Conectar al sitio

1. En la raíz del repo, copia `openai-config.worker.example.js` como `openai-config.js` (sobrescribiendo el local actual con la key directa).
2. Reemplaza `WORKER_URL` por la URL que te dio Wrangler.
3. Edita `.gitignore` y **quita** la línea de `openai-config.js` — ya es seguro commitearlo (no contiene secretos).
4. Commit y push.

## Test rápido

```sh
curl https://tu-worker.workers.dev -X POST \
  -H 'Content-Type: application/json' \
  -d '{"image":"BASE64_DE_TU_IMAGEN","mimeType":"image/jpeg"}'
```

Debería devolver JSON con `name`, `calories`, `protein`, `carbs`, `fat`, `portion`.

## Costos

- Cloudflare Workers: gratis hasta 100k requests/día (vas a usar < 100/día)
- OpenAI: ~\$0.0001 por foto (con tu hard limit de \$5/mes)

## Rotar la key de OpenAI

Si necesitas cambiarla:
```sh
wrangler secret put OPENAI_KEY
```
Pega la nueva, redeploy automático.
