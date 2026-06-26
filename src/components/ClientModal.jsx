import { useState } from 'react'
import { X } from 'lucide-react'
import { PHASES, PRODUITS } from '../constants.js'
import ChampHeure from './ChampHeure.jsx'
import ChampDuree from './ChampDuree.jsx'

// Modale d'ajout / modification d'un client.
// - Si "client" est fourni, on est en modification (champs pré-remplis).
// - Sinon, on crée un nouveau client.
export default function ClientModal({ client, onEnregistrer, onFermer }) {
  const [form, setForm] = useState(
    client || {
      nom: '',
      telephone: '',
      email: '',
      phase: 'R2', // R1 déjà passé hors CRM : une nouvelle fiche démarre au R2.
      docsRecus: false,
      auditFait: false,
      aReprogrammer: false,
      aRappeler: false,
      relanceLe: '',
      relanceMotif: '',
      etapes: [],
      perVersements: true,
      remplacementParProduit: {},
      assureurParProduit: {},
      statutProduit: {},
      revoirParProduit: {},
      produits: [],
      prochainRdv: '',
      prochainRdvHeure: '',
      prochainRdvDuree: 60,
      mailCrEnvoye: false, // après le R2 de cette nouvelle fiche, un CR sera attendu
      notes: '',
    },
  )

  // Met à jour un champ du formulaire.
  function maj(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }))
  }

  // Coche / décoche un produit.
  function basculerProduit(produit) {
    setForm((f) => {
      const dejaCoche = f.produits.includes(produit)
      return {
        ...f,
        produits: dejaCoche
          ? f.produits.filter((p) => p !== produit)
          : [...f.produits, produit],
      }
    })
  }

  function valider(e) {
    e.preventDefault()
    if (!form.nom.trim()) {
      alert('Le nom du client est obligatoire.')
      return
    }
    onEnregistrer(form)
  }

  return (
    <div className="modal-fond" onClick={onFermer}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-entete">
          <h2>{client ? 'Modifier le client' : 'Nouveau client'}</h2>
          <button className="btn-icone" onClick={onFermer} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={valider} className="formulaire">
          <label>
            Nom *
            <input
              type="text"
              value={form.nom}
              onChange={(e) => maj('nom', e.target.value)}
              autoFocus
            />
          </label>

          <div className="ligne-deux">
            <label>
              Téléphone
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => maj('telephone', e.target.value)}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => maj('email', e.target.value)}
              />
            </label>
          </div>

          <label>
            Phase du parcours
            <select value={form.phase} onChange={(e) => maj('phase', e.target.value)}>
              {PHASES.map((ph) => (
                <option key={ph}>{ph}</option>
              ))}
            </select>
            <span className="aide-champ">
              Une nouvelle fiche démarre au R2 (le R1 est déjà passé). Pense à indiquer la
              date du RDV ci-dessous : la relance documents/audit s'appuie dessus.
            </span>
          </label>

          <label>
            Produits
            <div className="cases-produits">
              {PRODUITS.map((p) => (
                <label key={p} className="case">
                  <input
                    type="checkbox"
                    checked={form.produits.includes(p)}
                    onChange={() => basculerProduit(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </label>

          <div className="ligne-trois">
            <label>
              Prochain RDV
              <input
                type="date"
                value={form.prochainRdv}
                onChange={(e) => maj('prochainRdv', e.target.value)}
              />
            </label>
            <label>
              Heure
              <ChampHeure
                value={form.prochainRdvHeure}
                onChange={(h) => maj('prochainRdvHeure', h)}
              />
            </label>
            <label>
              Durée
              <ChampDuree
                value={form.prochainRdvDuree}
                onChange={(d) => maj('prochainRdvDuree', d)}
              />
            </label>
          </div>

          <label>
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => maj('notes', e.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-gris" onClick={onFermer}>
              Annuler
            </button>
            <button type="submit" className="btn btn-principal">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
