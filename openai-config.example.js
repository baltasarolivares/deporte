// ─── OpenAI Config (TEMPLATE) ───────────────────────────────────────────────
// 1. Copia este archivo como `openai-config.js` (gitignored, no se sube al repo)
// 2. Reemplaza el placeholder por tu API key real (platform.openai.com/api-keys)
// 3. Pon un hard limit en platform.openai.com/account/limits

const OPENAI_API_KEY = 'sk-proj-PEGA_TU_KEY_AQUI'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

// ── Analizar imagen de comida ────────────────────────────────────────────────
async function analyzeFoodPhoto(base64Image, mimeType = 'image/jpeg') {
  const prompt = `Analiza esta foto de comida y responde SOLO con un JSON válido, sin texto adicional, con este formato exacto:
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

  const body = {
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' } }
      ]
    }],
    max_tokens: 300,
    response_format: { type: 'json_object' }
  }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const msg = errBody?.error?.message || 'Unknown error'
    console.error('OpenAI error body:', errBody)
    throw new Error(`${res.status}: ${msg}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  return JSON.parse(text)
}

// ── Convertir archivo a base64 ───────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Helpers Firestore para calorías ─────────────────────────────────────────
async function addFoodEntry(userId, entry) {
  const ref = firestore
    .collection('food_logs').doc(userId)
    .collection('entries')
  const doc = await ref.add({
    ...entry,
    timestamp: Date.now()
  })
  return doc.id
}

async function getDayFoodLogs(userId, date) {
  const snap = await firestore
    .collection('food_logs').doc(userId)
    .collection('entries')
    .where('date', '==', date)
    .get()
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

async function deleteFoodEntry(userId, entryId) {
  await firestore
    .collection('food_logs').doc(userId)
    .collection('entries').doc(entryId)
    .delete()
}

async function updateFoodEntry(userId, entryId, updates) {
  await firestore
    .collection('food_logs').doc(userId)
    .collection('entries').doc(entryId)
    .update(updates)
}

async function getWeekFoodLogs(userId, fromDate, toDate) {
  const snap = await firestore
    .collection('food_logs').doc(userId)
    .collection('entries')
    .where('date', '>=', fromDate)
    .where('date', '<=', toDate)
    .get()
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.timestamp - b.timestamp)
}
