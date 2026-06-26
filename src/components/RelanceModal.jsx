import { useState } from 'react'
import { X } from 'lucide-react'
import { aujourdhui, decalerDate } from '../dateUtils.js'

// Modale "À relancer le…" : le RDV a eu lieu mais on n'a pas closé / placé de R3
// (ex. la cliente doit d'abord voir son conseiller). On fixe une date de relance
// variable + un motif court. Le prospect est mis en attente jusqu'à cette date.
export default function RelanceModal({ client, onConfirmer, onFermer }) {
  const [date, setDate] = useState(client.relanceLe || decalerDate(aujourdhui(), 14))
  const [motif, setMotif] = useState(client.relanceMotif || '')

  function valider(e) {
    e.preventDefault()
    onConfirmer(date, motif.trim())
  }

  return (
    <div className="modal-fond" onClick={onFermer}>
      <div className="modal modal-petit" onClick={(e) => e.stopPropagation()}>
        <div className="modal-entete">
          <h2>À relancer — {client.nom}</h2>
          <button className="btn-icone" onClick={onFermer} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={valider} className="formulaire">
          <label>
            Date de relance
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
            <span className="aide-champ">
              Le prospect est mis en attente. La relance remontera dans « À faire » à
              cette date.
            </span>
          </label>

          <label>
            Motif (facultatif)
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex : doit voir son conseiller"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-gris" onClick={onFermer}>
              Annuler
            </button>
            <button type="submit" className="btn btn-principal">
              Mettre en relance
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
