// ─── Cloudflare Worker: proxy a OpenAI Vision ──────────────────────────────
// Mantiene la API key de OpenAI del lado servidor, fuera del cliente.
// Setup: `wrangler secret put OPENAI_KEY` y luego `wrangler deploy`.

const PROMPT = `Analiza esta foto de comida y responde SOLO con un JSON válido, sin texto adicional, con este formato exacto:
{
  "name": "nombre del plato o alimento",
  "calories": 000,
  "protein": 00,
  "carbs": 00,
  "fat": 00,
  "portion": "descripción de la porción estimada"
}
Reglas:
- Estima las calorías para la porción visible en la foto
- Si hay múltiples alimentos, suma las calorías totales y describe el plato completo
- Todos los valores numéricos en números enteros (sin decimales)
- Si no puedes identificar la comida con certeza, haz tu mejor estimación`

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    let payload
    try {
      payload = await request.json()
    } catch {
      return json({ error: 'Invalid JSON' }, 400)
    }

    const { image, mimeType = 'image/jpeg', notes = '' } = payload
    if (!image) return json({ error: 'image required' }, 400)

    const fullPrompt = notes && notes.trim()
      ? `${PROMPT}\n\nNotas del usuario para ajustar la estimación: "${notes.trim()}"`
      : PROMPT

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: fullPrompt },
            { type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${image}`, detail: 'low' } }
          ]
        }],
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })
    })

    if (!openaiRes.ok) {
      const errBody = await openaiRes.json().catch(() => ({}))
      return json({
        error:  errBody?.error?.message || 'OpenAI error',
        status: openaiRes.status
      }, openaiRes.status)
    }

    const data = await openaiRes.json()
    const text = data.choices?.[0]?.message?.content || '{}'
    try {
      return json(JSON.parse(text))
    } catch {
      return json({ error: 'Invalid JSON from OpenAI', raw: text }, 502)
    }
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}
