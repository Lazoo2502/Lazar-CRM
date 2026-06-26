import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { aujourdhui, decalerDate, formatDateFr, formatHeure } from '../dateUtils.js'
import { infoStatut } from '../pipeline.js'

// Bornes horaires affichées et hauteur d'une heure (px).
const DEBUT = 8
const FIN = 20
const PX_H = 52
const DUREE_DEFAUT = 60 // minutes (on ne stocke que l'heure de début)

// Lundi de la semaine contenant la date donnée.
function lundiDe(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const jour = (d.getDay() + 6) % 7 // 0 = lundi
  return decalerDate(dateStr, -jour)
}

function minutes(heure) {
  const [h, m] = heure.split(':')
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}

function infoJour(date) {
  const d = new Date(date + 'T00:00:00')
  return { nom: d.toLocaleDateString('fr-FR', { weekday: 'short' }), num: d.getDate() }
}

// Répartit les RDV qui se chevauchent sur des "couloirs" côte à côte. Renvoie le nb de couloirs.
function repartir(evs) {
  const finCouloirs = []
  evs.forEach((ev) => {
    let place = false
    for (let i = 0; i < finCouloirs.length; i++) {
      if (finCouloirs[i] <= ev.debut) {
        ev.couloir = i
        finCouloirs[i] = ev.fin
        place = true
        break
      }
    }
    if (!place) {
      ev.couloir = finCouloirs.length
      finCouloirs.push(ev.fin)
    }
  })
  return Math.max(1, finCouloirs.length)
}

export default function AgendaSemaine({ clients, onOuvrirClient }) {
  const [lundi, setLundi] = useState(() => lundiDe(aujourdhui()))
  const auj = aujourdhui()

  const jours = Array.from({ length: 7 }, (_, i) => decalerDate(lundi, i))
  const heures = Array.from({ length: FIN - DEBUT + 1 }, (_, i) => DEBUT + i)

  // RDV par jour (timés et sans heure).
  function rdvDuJour(date) {
    return clients.filter((c) => c.prochainRdv === date)
  }

  return (
    <div className="semaine">
      <div className="semaine-nav">
        <button className="btn-icone" onClick={() => setLundi(decalerDate(lundi, -7))}>
          <ChevronLeft size={20} />
        </button>
        <span className="semaine-titre">
          {formatDateFr(jours[0])} — {formatDateFr(jours[6])}
        </span>
        <button className="btn-icone" onClick={() => setLundi(decalerDate(lundi, 7))}>
          <ChevronRight size={20} />
        </button>
        <button
          className="btn btn-gris btn-petit"
          onClick={() => setLundi(lundiDe(aujourdhui()))}
        >
          Aujourd'hui
        </button>
      </div>

      {/* En-têtes des jours */}
      <div className="semaine-grille semaine-entete">
        <div className="semaine-coin" />
        {jours.map((j) => {
          const info = infoJour(j)
          return (
            <div key={j} className={`semaine-jour-th ${j === auj ? 'aujourdhui' : ''}`}>
              <span className="semaine-jour-nom">{info.nom}</span>
              <span className="semaine-jour-num">{info.num}</span>
            </div>
          )
        })}
      </div>

      {/* Bande "sans heure" */}
      <div className="semaine-grille semaine-allday">
        <div className="semaine-allday-label">sans h.</div>
        {jours.map((j) => (
          <div key={j} className="semaine-allday-cell">
            {rdvDuJour(j)
              .filter((c) => !c.prochainRdvHeure)
              .map((c) => (
                <button
                  key={c.id}
                  className={`semaine-chip event-${infoStatut(c.phase).couleur}`}
                  onClick={() => onOuvrirClient(c.id)}
                  title={c.nom}
                >
                  {c.nom}
                </button>
              ))}
          </div>
        ))}
      </div>

      {/* Corps : heures + colonnes */}
      <div className="semaine-grille semaine-corps">
        <div className="semaine-heures-col" style={{ height: (FIN - DEBUT) * PX_H }}>
          {heures.map((h) => (
            <span key={h} className="semaine-heure-label" style={{ top: (h - DEBUT) * PX_H }}>
              {h}h
            </span>
          ))}
        </div>

        {jours.map((j) => {
          // Événements timés du jour, préparés pour le positionnement.
          const evs = rdvDuJour(j)
            .filter((c) => c.prochainRdvHeure)
            .map((c) => {
              const debut = minutes(c.prochainRdvHeure)
              const duree = c.prochainRdvDuree || DUREE_DEFAUT
              return { client: c, heure: c.prochainRdvHeure, debut, fin: debut + duree, duree }
            })
            .sort((a, b) => a.debut - b.debut)
          const nbCouloirs = repartir(evs)

          return (
            <div
              key={j}
              className={`semaine-col ${j === auj ? 'aujourdhui' : ''}`}
              style={{ height: (FIN - DEBUT) * PX_H }}
            >
              {heures.map((h) => (
                <div
                  key={h}
                  className="semaine-ligne-h"
                  style={{ top: (h - DEBUT) * PX_H }}
                />
              ))}

              {evs.map((ev) => {
                const top = (ev.debut / 60 - DEBUT) * PX_H
                const hauteur = (ev.duree / 60) * PX_H - 3
                const largeur = 100 / nbCouloirs
                const statut = infoStatut(ev.client.phase)
                return (
                  <button
                    key={ev.client.id}
                    className={`semaine-event event-${statut.couleur}`}
                    style={{
                      top,
                      height: hauteur,
                      left: `calc(${ev.couloir * largeur}% + 2px)`,
                      width: `calc(${largeur}% - 4px)`,
                    }}
                    onClick={() => onOuvrirClient(ev.client.id)}
                  >
                    <span className="semaine-event-h">{formatHeure(ev.heure)}</span>
                    <span className="semaine-event-nom">{ev.client.nom}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
