import { useState } from 'react'
import {
  Search,
  Calendar,
  Plus,
  FileClock,
  CalendarX,
  CalendarPlus,
  PhoneCall,
  Clock,
} from 'lucide-react'
import { STATUT_TERMINE } from '../constants.js'
import { formatDateFr, formatHeure } from '../dateUtils.js'
import {
  infoStatut,
  attendDocuments,
  progressionProduit,
  pointManquant,
  statutProduit,
  infoStatutProduit,
  produitSuivi,
} from '../pipeline.js'

// Ordre des phases dans l'onglet Prospects (sert au filtre et au tri).
const PHASES_PROSPECT = ['R1', 'R2', 'R3', 'RDV ponctuel', 'Perdu']

// Vue liste : barre de recherche + grille de cartes.
// "filtre" vaut 'prospects' (tunnel en cours + perdus) ou 'clients' (closés).
export default function Clients({
  clients,
  dems,
  filtre,
  recherche,
  onRecherche,
  onOuvrirClient,
  onNouveauClient,
}) {
  const estClients = filtre === 'clients'

  // Filtre par phase, uniquement utile dans l'onglet Prospects. 'Tous' = pas de filtre.
  const [phaseFiltre, setPhaseFiltre] = useState('Tous')

  // 1) bon groupe (clients closés OU prospects) + 2) recherche par nom.
  const base = clients
    .filter((c) => (estClients ? c.phase === 'Closé' : c.phase !== 'Closé'))
    .filter((c) => c.nom.toLowerCase().includes(recherche.trim().toLowerCase()))

  // Nombre de prospects par phase (pour afficher les compteurs sur les pastilles).
  const compteParPhase = {}
  PHASES_PROSPECT.forEach((ph) => {
    compteParPhase[ph] = base.filter((c) => c.phase === ph).length
  })

  // 3) filtre par phase (prospects uniquement), puis tri par phase puis par nom.
  const filtres = base
    .filter((c) => estClients || phaseFiltre === 'Tous' || c.phase === phaseFiltre)
    .sort((a, b) => {
      if (!estClients) {
        const d = PHASES_PROSPECT.indexOf(a.phase) - PHASES_PROSPECT.indexOf(b.phase)
        if (d !== 0) return d
      }
      return a.nom.localeCompare(b.nom)
    })

  // Compte les démarches en cours (non terminées) par client.
  function demarchesEnCours(clientId) {
    return dems.filter((d) => d.clientId === clientId && d.statut !== STATUT_TERMINE).length
  }

  return (
    <div className="vue">
      <div className="barre-clients">
        <div className="champ-recherche">
          <Search size={18} />
          <input
            type="text"
            placeholder={`Rechercher un ${estClients ? 'client' : 'prospect'} par nom…`}
            value={recherche}
            onChange={(e) => onRecherche(e.target.value)}
          />
        </div>
        {/* Les nouveaux contacts entrent toujours comme prospects (R1). */}
        {!estClients && (
          <button className="btn btn-principal" onClick={onNouveauClient}>
            <Plus size={18} /> Nouveau prospect
          </button>
        )}
      </div>

      {/* Pastilles de filtre par phase (onglet Prospects uniquement) */}
      {!estClients && (
        <div className="filtres-phase">
          <button
            className={`pastille-filtre ${phaseFiltre === 'Tous' ? 'actif' : ''}`}
            onClick={() => setPhaseFiltre('Tous')}
          >
            Tous <span className="pastille-compte">{base.length}</span>
          </button>
          {PHASES_PROSPECT.map((ph) => (
            <button
              key={ph}
              className={`pastille-filtre ${phaseFiltre === ph ? 'actif' : ''}`}
              onClick={() => setPhaseFiltre(ph)}
            >
              {ph} <span className="pastille-compte">{compteParPhase[ph]}</span>
            </button>
          ))}
        </div>
      )}

      {filtres.length === 0 ? (
        <div className="bloc-vide">
          {estClients
            ? 'Aucun client closé pour le moment.'
            : 'Aucun prospect ne correspond à cette recherche.'}
        </div>
      ) : (
        <div className="grille-clients">
          {filtres.map((c) => (
            <button key={c.id} className="carte-client" onClick={() => onOuvrirClient(c.id)}>
              <div className="carte-entete">
                <span className="carte-nom">{c.nom}</span>
                <span className={`badge badge-${infoStatut(c.phase).couleur}`}>
                  {infoStatut(c.phase).libelle}
                </span>
              </div>

              <div className="carte-meta">
                <span className="badge-etape">{c.phase}</span>

                {demarchesEnCours(c.id) > 0 && (
                  <span className="badge-demarches">
                    {demarchesEnCours(c.id)} démarche{demarchesEnCours(c.id) > 1 ? 's' : ''}
                  </span>
                )}

                {pointManquant(c) && (
                  <span className="badge-point">
                    <CalendarPlus size={13} /> Point à placer
                  </span>
                )}

                {c.relanceLe && (
                  <span className="badge-point">
                    <Clock size={13} /> Relance {formatDateFr(c.relanceLe)}
                  </span>
                )}

                {c.aReprogrammer ? (
                  <span className="badge-reprog">
                    <CalendarX size={13} /> À reprogrammer
                  </span>
                ) : c.aRappeler ? (
                  <span className="badge-reprog">
                    <PhoneCall size={13} /> À rappeler
                  </span>
                ) : (
                  attendDocuments(c.phase) &&
                  !c.docsRecus && (
                    <span className="badge-docs">
                      <FileClock size={13} /> Docs en attente
                    </span>
                  )
                )}
              </div>

              {/* Client closé : barre d'avancement par produit. Prospect : simples tags. */}
              {c.produits && c.produits.length > 0 && (
                <>
                  {estClients ? (
                    <div className="prod-progress-liste">
                      {c.produits.map((p) => {
                        const st = statutProduit(c, p)
                        // Closé / en cours → barre d'avancement ; sinon → statut.
                        if (produitSuivi(st)) {
                          const { faites, total } = progressionProduit(c, p)
                          const pct = total ? Math.round((faites / total) * 100) : 100
                          return (
                            <div key={p} className="prod-progress">
                              <span className="prod-progress-nom">{p}</span>
                              <div className="barre">
                                <div
                                  className={`barre-fill ${faites === total ? 'complete' : ''}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="prod-progress-cnt">
                                {faites}/{total}
                              </span>
                            </div>
                          )
                        }
                        return (
                          <div key={p} className="prod-progress">
                            <span className="prod-progress-nom">{p}</span>
                            <span className={`badge badge-${infoStatutProduit(st).couleur}`}>
                              {infoStatutProduit(st).libelle}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="carte-produits">
                      {c.produits.map((p) => (
                        <span key={p} className="produit-tag">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              {c.prochainRdv && (
                <div className="carte-rdv">
                  <Calendar size={14} /> RDV {formatDateFr(c.prochainRdv)}
                  {c.prochainRdvHeure && ` à ${formatHeure(c.prochainRdvHeure)}`}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
