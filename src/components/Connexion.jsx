import { useState } from 'react'
import { supabase } from '../supabase.js'

// Écran de connexion : email + mot de passe (authentification Supabase).
export default function Connexion() {
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  async function seConnecter(e) {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: mdp })
    setChargement(false)
    if (error) setErreur('Email ou mot de passe incorrect.')
  }

  return (
    <div className="connexion-fond">
      <form className="connexion-carte" onSubmit={seConnecter}>
        <h1>CRM Patrimoine</h1>
        <p className="connexion-sous">Connecte-toi pour accéder à ton CRM.</p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={mdp}
            onChange={(e) => setMdp(e.target.value)}
            required
          />
        </label>

        {erreur && <p className="connexion-erreur">{erreur}</p>}

        <button type="submit" className="btn btn-principal" disabled={chargement}>
          {chargement ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
