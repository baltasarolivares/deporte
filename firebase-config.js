// ─── Firebase Config ────────────────────────────────────────────────────────
// Reemplaza los valores después de crear el proyecto en console.firebase.google.com

const firebaseConfig = {
  apiKey: "AIzaSyB4vGl975j-FC3OBFfH7pN7OUn7VJF1Tlk",
  authDomain: "deporte-tracker.firebaseapp.com",
  projectId: "deporte-tracker",
  storageBucket: "deporte-tracker.firebasestorage.app",
  messagingSenderId: "803631117885",
  appId: "1:803631117885:web:a92244c7fbfcbb5e6b5c54"
}

// Requiere en el HTML (antes de este script):
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>

firebase.initializeApp(firebaseConfig)
const auth      = firebase.auth()
const firestore = firebase.firestore()

// ─── Auth ────────────────────────────────────────────────────────────────────

async function signIn(email, password) {
  const { user } = await auth.signInWithEmailAndPassword(email, password)
  return user
}

async function signOut() {
  await auth.signOut()
}

async function getCurrentUser() {
  return auth.currentUser
}

function onAuthChange(callback) {
  auth.onAuthStateChanged(callback)
}

// ─── Perfil ──────────────────────────────────────────────────────────────────

async function getProfile(userId) {
  const doc = await firestore.collection('profiles').doc(userId).get()
  return doc.exists ? { id: doc.id, ...doc.data() } : null
}

async function getAllProfiles() {
  const snap = await firestore.collection('profiles').get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// Devuelve los círculos del perfil como array (acepta `circles: []` o `circle: 'X'`)
function profileCircles(profile) {
  if (Array.isArray(profile?.circles) && profile.circles.length) return profile.circles
  if (profile?.circle) return [profile.circle]
  return ['TriniTeam']
}

// ─── Logs diarios ────────────────────────────────────────────────────────────
// Estructura: logs/{userId}/entries/{YYYY-MM-DD}

async function getLog(userId, date) {
  const doc = await firestore
    .collection('logs').doc(userId)
    .collection('entries').doc(date)
    .get()
  return doc.exists ? { id: doc.id, ...doc.data() } : null
}

async function upsertLog(userId, date, fields) {
  const ref = firestore
    .collection('logs').doc(userId)
    .collection('entries').doc(date)
  await ref.set({ log_date: date, ...fields }, { merge: true })
  const updated = await ref.get()
  return { id: updated.id, ...updated.data() }
}

async function getMonthLogs(userId, year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to   = `${year}-${String(month).padStart(2, '0')}-31`
  const snap = await firestore
    .collection('logs').doc(userId)
    .collection('entries')
    .where('log_date', '>=', from)
    .where('log_date', '<=', to)
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]
}
