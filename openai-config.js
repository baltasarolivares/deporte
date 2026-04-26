// ─── OpenAI Config (modo Worker) ────────────────────────────────────────────
// La key real vive en Cloudflare Worker como secret cifrado.
// Ver `worker/README.md` para detalles del setup.

const WORKER_URL = 'https://deporte-calorias-proxy.hvwmxmnrr6.workers.dev'

// ── Analizar imagen de comida ────────────────────────────────────────────────
async function analyzeFoodPhoto(base64Image, mimeType = 'image/jpeg') {
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, mimeType })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Worker error body:', err)
    throw new Error(`${res.status}: ${err?.error || 'Worker error'}`)
  }
  return res.json()
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
