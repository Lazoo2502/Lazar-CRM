import { createClient } from '@supabase/supabase-js'

// Fonction serveur (Vercel) : Google nous renvoie ici après autorisation.
// On échange le "code" contre un refresh token, qu'on stocke pour l'utilisateur.
export default async function handler(req, res) {
  const code = req.query.code
  const state = req.query.state // jeton Supabase de l'utilisateur (pour l'identifier)
  if (!code || !state) {
    return res.status(400).send('Paramètres manquants')
  }

  // Client Supabase agissant au nom de l'utilisateur (sécurité RLS).
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${state}` } },
  })
  const { data: u, error: ue } = await sb.auth.getUser(state)
  if (ue || !u?.user) {
    return res.status(401).send('Session invalide')
  }

  // Échange du code contre les jetons Google.
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `https://${req.headers.host}/api/google-callback`,
      grant_type: 'authorization_code',
    }),
  }).then((r) => r.json())

  if (!tok.refresh_token) {
    return res.redirect('/?google=erreur')
  }

  // On garde le refresh token (permet de recréer des accès plus tard, sans reconnexion).
  const { error: se } = await sb
    .from('google_tokens')
    .upsert({ user_id: u.user.id, refresh_token: tok.refresh_token })
  if (se) {
    return res.redirect('/?google=erreur')
  }

  res.redirect('/?google=ok')
}
