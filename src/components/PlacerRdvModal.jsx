import { useState } from 'react'
import { X } from 'lucide-react'
import { aujourdhui, decalerDate } from '../dateUtils.js'
import ChampHeure from './ChampHeure.jsx'
import ChampDuree from './ChampDuree.jsx'

// Petite modale pour faire avancer le parcours en plaçant un nouveau rendez-vous (R2 ou R3).
// On demande simplement la date du RDV. Le suivi des documents redémarre à zéro.
export default function PlacerRdvModal({ cible, client, onConfirmer, onFermer }) {
  const [date, setDate] = useState(decalerDate(aujourdhui(), 7))
  const [heure, setHeure] = useState(client.prochainRdvHeure || '')
  const [duree, setDuree] = useState(client.prochainRdvDuree || 60)

  // "Point" = point de situation (client closé) ; sinon on place un R2/R3 (restitution).
  const estPoint = cible === 'Point'
  const titre = estPoint ? 'Placer un point' : `Placer un ${cible}`

  function valider(e) {
    e.preventDefault()
    onConfirmer(date, heure, duree)
  }

  return (
    <div className="modal-fond" onClick={onFermer}>
      <div className="modal modal-petit" onClick={(e) => e.stopPropagation()}>
        <div className="modal-entete">
          <h2>
            {titre} — {client.nom}
          </h2>
          <button className="btn-icone" onClick={onFermer} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={valider} className="formulaire">
          <div className="ligne-trois">
            <label>
              {estPoint ? 'Date du point' : `Date du ${cible}`}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                autoFocus
              />
            </label>
            <label>
              Heure
              <ChampHeure value={heure} onChange={setHeure} />
            </label>
            <label>
              Durée
              <ChampDuree value={duree} onChange={setDuree} />
            </label>
          </div>
          {!estPoint && (
            <span className="aide-champ">
              Le suivi des documents redémarre : un rappel apparaîtra 48h avant ce RDV tant
              que tu n'auras pas coché « documents reçus ».
            </span>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-gris" onClick={onFermer}>
              Annuler
            </button>
            <button type="submit" className="btn btn-principal">
              {titre}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
