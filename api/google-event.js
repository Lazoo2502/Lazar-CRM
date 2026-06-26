import { createClient } from '@supabase/supabase-js'

// Obtient un jeton d'accès Google frais à partir du refresh token (côté serveur).
async function jetonAcces(refresh) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  }).then((x) => x.json())
  return r.access_token
}

// Fonction serveur : crée / met à jour / supprime un événement dans l'agenda de l'utilisateur.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const jwt = (req.headers.authorization || '').replace('Bearer ', '')
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: u } = await sb.auth.getUser(jwt)
  if (!u?.user) return res.status(401).json({ error: 'non_connecte' })

  const { data: row } = await sb
    .from('google_tokens')
    .select('refresh_token')
    .eq('user_id', u.user.id)
    .maybeSingle()
  if (!row) return res.status(400).json({ error: 'google_non_connecte' })

  const token = await jetonAcces(row.refresh_token)
  if (!token) return res.status(400).json({ error: 'token' })

  const { action, event, eventId } = req.body || {}
  const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

  let r
  if (action === 'delete') {
    r = await fetch(`${base}/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json({ ok: r.ok })
  }
  if (action === 'update' && eventId) {
    r = await fetch(`${base}/${eventId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  } else {
    r = await fetch(base, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
  }
  const data = await r.json()
  if (!r.ok) return res.status(400).json({ error: 'calendar', detail: data })
  res.json({ ok: true, id: data.id })
}
