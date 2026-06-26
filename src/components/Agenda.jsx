import { useState } from 'react'
import { Calendar, Clock, AlertTriangle, ChevronRight, List, LayoutGrid } from 'lucide-react'
import { aujourdhui, decalerDate, formatDateFr } from '../dateUtils.js'
import { infoStatut } from '../pipeline.js'
import ChampHeure from './ChampHeure.jsx'
import ChampDuree from './ChampDuree.jsx'
import AgendaSemaine from './AgendaSemaine.jsx'

// Conteneur Agenda : choix entre vue Liste (par jour) et vue Semaine (vraie grille).
export default function Agenda({ clients, onOuvrirClient, onDefinirHeure, onDefinirDuree }) {
  const [vue, setVue] = useState('semaine')

  return (
    <div className="vue">
      <div className="agenda-bascule">
        <button
          className={`bascule-btn ${vue === 'semaine' ? 'actif' : ''}`}
          onClick={() => setVue('semaine')}
        >
          <LayoutGrid size={16} /> Semaine
        </button>
        <button
          className={`bascule-btn ${vue === 'liste' ? 'actif' : ''}`}
          onClick={() => setVue('liste')}
        >
          <List size={16} /> Liste
        </button>
      </div>

      {vue === 'semaine' ? (
        <AgendaSemaine clients={clients} onOuvrirClient={onOuvrirClient} />
      ) : (
        <AgendaListe
          clients={clients}
          onOuvrirClient={onOuvrirClient}
          onDefinirHeure={onDefinirHeure}
          onDefinirDuree={onDefinirDuree}
        />
      )}
    </div>
  )
}

// Vue Liste : les RDV regroupés par jour, triés par heure. L'heure est modifiable
// directement sur chaque ligne (pour combler les RDV sans horaire). Section "à traiter"
// en haut pour les RDV déjà passés.
function AgendaListe({ clients, onOuvrirClient, onDefinirHeure, onDefinirDuree }) {
  const auj = aujourdhui()
  const demain = decalerDate(auj, 1)

  // Tous les RDV (un par client qui a un prochainRdv), triés par date puis heure.
  const rdvs = clients
    .filter((c) => c.prochainRdv)
    .map((c) => ({ client: c, date: c.prochainRdv, heure: c.prochainRdvHeure || '' }))
    .sort((a, b) =>
      a.date === b.date ? a.heure.localeCompare(b.heure) : a.date.localeCompare(b.date),
    )

  const passes = rdvs.filter((r) => r.date < auj)
  const aVenir = rdvs.filter((r) => r.date >= auj)

  // Regroupement des RDV à venir par date (dans l'ordre).
  const parJour = []
  for (const r of aVenir) {
    let groupe = parJour.find((g) => g.date === r.date)
    if (!groupe) {
      groupe = { date: r.date, items: [] }
      parJour.push(groupe)
    }
    groupe.items.push(r)
  }

  function libelleJour(date) {
    if (date === auj) return "Aujourd'hui"
    if (date === demain) return 'Demain'
    return formatDateFr(date)
  }

  return (
    <>
      {rdvs.length === 0 && (
        <div className="bloc-vide">Aucun rendez-vous programmé pour le moment.</div>
      )}

      {/* RDV passés non replacés : à traiter */}
      {passes.length > 0 && (
        <section className="agenda-jour">
          <h3 className="agenda-jour-titre agenda-passe">
            <AlertTriangle size={16} /> RDV passés — à traiter
            <span className="groupe-compte">{passes.length}</span>
          </h3>
          <div className="agenda-liste">
            {passes.map((r) => (
              <LigneRdv
                key={r.client.id}
                rdv={r}
                onOuvrirClient={onOuvrirClient}
                onDefinirHeure={onDefinirHeure}
                onDefinirDuree={onDefinirDuree}
                passe
              />
            ))}
          </div>
        </section>
      )}

      {/* RDV à venir, jour par jour */}
      {parJour.map((g) => (
        <section key={g.date} className="agenda-jour">
          <h3 className="agenda-jour-titre">
            <Calendar size={16} /> {libelleJour(g.date)}
            <span className="groupe-compte">{g.items.length}</span>
          </h3>
          <div className="agenda-liste">
            {g.items.map((r) => (
              <LigneRdv
                key={r.client.id}
                rdv={r}
                onOuvrirClient={onOuvrirClient}
                onDefinirHeure={onDefinirHeure}
                onDefinirDuree={onDefinirDuree}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function LigneRdv({ rdv, onOuvrirClient, onDefinirHeure, onDefinirDuree, passe }) {
  const { client, heure } = rdv
  const statut = infoStatut(client.phase)
  return (
    <div className={`agenda-rdv ${passe ? 'agenda-rdv-passe' : ''} ${heure ? '' : 'sans-heure'}`}>
      {/* Heure + durée modifiables directement ici */}
      <label className="agenda-heure-edit" title="Définir l'heure">
        <Clock size={15} />
        <ChampHeure value={heure} onChange={(h) => onDefinirHeure(client, h)} />
      </label>
      <ChampDuree
        className="agenda-duree"
        value={client.prochainRdvDuree}
        onChange={(d) => onDefinirDuree(client, d)}
      />

      {/* Le reste de la ligne ouvre la fiche */}
      <button className="agenda-rdv-ouvrir" onClick={() => onOuvrirClient(client.id)}>
        <span className="agenda-nom">{client.nom}</span>
        <span className="agenda-badges">
          <span className="badge-etape">{client.phase}</span>
          <span className={`badge badge-${statut.couleur}`}>{statut.libelle}</span>
        </span>
        <ChevronRight size={18} className="agenda-fleche" />
      </button>
    </div>
  )
}
