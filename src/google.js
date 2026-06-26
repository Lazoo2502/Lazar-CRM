import { supabase } from './supabase.js'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Lance la connexion Google (redirige vers l'écran d'autorisation Google).
export async function connecterGoogle() {
  const { data } = await supabase.auth.getSession()
  const jwt = data.session?.access_token
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${window.location.origin}/api/google-callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
    state: jwt,
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// Google est-il connecté (mémorisé localement après l'autorisation) ?
export function googleConnecte() {
  return localStorage.getItem('google_connecte') === '1'
}

export function setGoogleConnecte(ok) {
  if (ok) localStorage.setItem('google_connecte', '1')
  else localStorage.removeItem('google_connecte')
}

// Envoie une opération au calendrier via la fonction serveur. Renvoie l'id de l'événement.
export async function calendrierOp(action, event, eventId) {
  const { data } = await supabase.auth.getSession()
  const jwt = data.session?.access_token
  if (!jwt) return null
  const r = await fetch('/api/google-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ action, event, eventId }),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    if (j.error === 'google_non_connecte') setGoogleConnecte(false)
    console.warn('Calendrier : échec', j)
    return null
  }
  const j = await r.json()
  return j.id || null
}

// Construit l'événement Google à partir d'un client (son prochain RDV).
export function evenementDepuisClient(client) {
  if (!client.prochainRdv) return null
  const heure = client.prochainRdvHeure || '09:00'
  const duree = client.prochainRdvDuree || 60
  const debut = new Date(`${client.prochainRdv}T${heure}:00`)
  const fin = new Date(debut.getTime() + duree * 60000)
  return {
    summary: `${client.phase} — ${client.nom}`,
    description: client.notes || '',
    start: { dateTime: debut.toISOString() },
    end: { dateTime: fin.toISOString() },
  }
}
