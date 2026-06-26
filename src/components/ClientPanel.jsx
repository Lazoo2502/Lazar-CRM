import { useState } from 'react'
import {
  X,
  Phone,
  Mail,
  Pencil,
  Trash2,
  Plus,
  Calendar,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileClock,
  XCircle,
  RotateCcw,
  CalendarX,
  PhoneCall,
  Clock,
  ClipboardCheck,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { STATUT_TERMINE, ASSUREURS } from '../constants.js'
import { formatDateFr, formatHeure, urgence } from '../dateUtils.js'
import {
  infoStatut,
  attendDocuments,
  etapesProduit,
  etatEtape,
  etapeNonApplicable,
  couleurEtape,
  libelleEtat,
  etatsPossibles,
  champMontant,
  progressionProduit,
  STATUTS_PRODUIT,
  statutProduit,
  infoStatutProduit,
  produitSuivi,
  revoirLe,
} from '../pipeline.js'

// Panneau latéral : fiche détaillée d'un client + parcours + ses démarches.
export default function ClientPanel({
  client,
  dems,
  onFermer,
  onModifierClient,
  onSupprimerClient,
  onAjouterDemarche,
  onModifierDemarche,
  onSupprimerDemarche,
  onAvancerEtape,
  onDefinirStatutEtape,
  onMajChampEtape,
  onDefinirAssureur,
  onDefinirStatutProduit,
  onDefinirRevoir,
  onBasculerPerVersements,
  onBasculerRemplacement,
  onPlacerRdv,
  onCloser,
  onNoShow,
  onARappeler,
  onARelancer,
  onPerdu,
  onBasculerDocs,
  onBasculerAudit,
  onReactiver,
}) {
  if (!client) return null

  const statut = infoStatut(client.phase)

  const demsClient = dems
    .filter((d) => d.clientId === client.id)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  return (
    <div className="panneau-fond" onClick={onFermer}>
      <aside className="panneau" onClick={(e) => e.stopPropagation()}>
        <div className="panneau-entete">
          <div>
            <h2>{client.nom}</h2>
            <div className="panneau-sous-titre">
              <span className="badge-etape">{client.phase}</span>
              <span className={`badge badge-${statut.couleur}`}>{statut.libelle}</span>
            </div>
          </div>
          <button className="btn-icone" onClick={onFermer} aria-label="Fermer">
            <X size={22} />
          </button>
        </div>

        {/* ===== Parcours : actions pour faire avancer le tunnel ===== */}
        <div className="panneau-section">
          <h4>Parcours</h4>
          <Parcours
            client={client}
            onPlacerRdv={onPlacerRdv}
            onCloser={onCloser}
            onNoShow={onNoShow}
            onARappeler={onARappeler}
            onARelancer={onARelancer}
            onPerdu={onPerdu}
            onReactiver={onReactiver}
          />
        </div>

        {/* ===== Préparation du R2/R3 : documents puis audit ===== */}
        {attendDocuments(client.phase) && !client.aReprogrammer && !client.aRappeler && (
          <div className="panneau-section">
            <h4>Préparation du {client.phase}</h4>

            {/* Étape 1 : documents */}
            {client.docsRecus ? (
              <div className="docs-ligne docs-ok">
                <FileCheck2 size={18} /> Documents reçus
                <button className="btn btn-gris btn-petit" onClick={() => onBasculerDocs(client)}>
                  Annuler
                </button>
              </div>
            ) : (
              <div className="docs-ligne docs-attente">
                <FileClock size={18} />
                <span>
                  Documents en attente — relance automatique J-2 et J-1 (à recevoir 24h
                  avant minimum). Sinon, envoie un mail.
                </span>
                <button
                  className="btn btn-principal btn-petit"
                  onClick={() => onBasculerDocs(client)}
                >
                  Marquer reçus
                </button>
              </div>
            )}

            {/* Étape 2 : audit (une fois les documents reçus) */}
            {client.docsRecus &&
              (client.auditFait ? (
                <div className="docs-ligne docs-ok" style={{ marginTop: 8 }}>
                  <ClipboardCheck size={18} /> Audit fait
                  <button
                    className="btn btn-gris btn-petit"
                    onClick={() => onBasculerAudit(client)}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div className="docs-ligne docs-attente" style={{ marginTop: 8 }}>
                  <ClipboardList size={18} />
                  <span>Audit à faire avant le rendez-vous.</span>
                  <button
                    className="btn btn-principal btn-petit"
                    onClick={() => onBasculerAudit(client)}
                  >
                    Audit fait
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Contact cliquable */}
        <div className="panneau-section">
          {client.telephone && (
            <a className="ligne-contact" href={`tel:${client.telephone}`}>
              <Phone size={16} /> {client.telephone}
            </a>
          )}
          {client.email && (
            <a className="ligne-contact" href={`mailto:${client.email}`}>
              <Mail size={16} /> {client.email}
            </a>
          )}
          {client.prochainRdv && (
            <div className="ligne-contact">
              <Calendar size={16} /> Prochain RDV : {formatDateFr(client.prochainRdv)}
              {client.prochainRdvHeure && ` à ${formatHeure(client.prochainRdvHeure)}`}
            </div>
          )}
        </div>

        {/* Notes */}
        {client.notes && (
          <div className="panneau-section">
            <h4>Notes</h4>
            <p className="notes-texte">{client.notes}</p>
          </div>
        )}

        {/* Boutons client */}
        <div className="panneau-boutons">
          <button className="btn btn-gris" onClick={() => onModifierClient(client)}>
            <Pencil size={16} /> Modifier
          </button>
          <button className="btn btn-danger" onClick={() => onSupprimerClient(client)}>
            <Trash2 size={16} /> Supprimer
          </button>
        </div>

        {/* Suivi par produit : checklist cliquable (vert = fait, rouge = pas fait) */}
        <div className="panneau-section">
          <h4>Suivi par produit</h4>

          {(client.produits || []).length === 0 ? (
            <p className="vide-doux">
              Aucun produit. Clique sur « Modifier » pour en ajouter au client.
            </p>
          ) : (
            client.produits.map((produit) => (
              <ChecklistProduit
                key={produit}
                client={client}
                produit={produit}
                onAvancerEtape={onAvancerEtape}
                onDefinirStatutEtape={onDefinirStatutEtape}
                onMajChampEtape={onMajChampEtape}
                onDefinirAssureur={onDefinirAssureur}
                onDefinirStatutProduit={onDefinirStatutProduit}
                onDefinirRevoir={onDefinirRevoir}
                onBasculerPerVersements={onBasculerPerVersements}
                onBasculerRemplacement={onBasculerRemplacement}
              />
            ))
          )}
        </div>

        {/* Démarches libres (audit, mail, document à récupérer…) */}
        <div className="panneau-section">
          <div className="panneau-section-entete">
            <h4>Démarches ({demsClient.length})</h4>
            <button className="btn btn-principal btn-petit" onClick={() => onAjouterDemarche()}>
              <Plus size={16} /> Ajouter
            </button>
          </div>

          {demsClient.length === 0 ? (
            <p className="vide-doux">Aucune démarche.</p>
          ) : (
            <div className="liste-demarches-fiche">
              {demsClient.map((d) => (
                <DemarcheFiche
                  key={d.id}
                  demarche={d}
                  montrerProduit
                  onModifier={() => onModifierDemarche(d)}
                  onSupprimer={() => onSupprimerDemarche(d)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

// Checklist d'un produit : statut (Closé/À revoir/KO) + assureur + étapes.
function ChecklistProduit({
  client,
  produit,
  onAvancerEtape,
  onDefinirStatutEtape,
  onMajChampEtape,
  onDefinirAssureur,
  onDefinirStatutProduit,
  onDefinirRevoir,
  onBasculerPerVersements,
  onBasculerRemplacement,
}) {
  const etapes = etapesProduit(produit)
  const aRemplacement = etapes.some((e) => e.remplacementSeulement)

  const statut = statutProduit(client, produit)
  const suivi = produitSuivi(statut) // closé / en cours → on affiche la checklist

  // Versement prévu (sur la souscription) pour comparer au versement réel (mise en place).
  const montantPrevu = etatEtape(client, produit, 'Souscription').montant

  // Avancement du produit (barre de progression).
  const { faites, total } = progressionProduit(client, produit)
  const pct = total ? Math.round((faites / total) * 100) : 100

  return (
    <div className={`produit-bloc statut-${infoStatutProduit(statut).couleur}`}>
      <div className="produit-bloc-entete">
        <span className="produit-tag produit-tag-gros">{produit}</span>
        <label className="case-inline">
          Statut
          <select
            value={statut}
            onChange={(e) => onDefinirStatutProduit(client, produit, e.target.value)}
          >
            {STATUTS_PRODUIT.map((s) => (
              <option key={s} value={s}>
                {infoStatutProduit(s).libelle}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* "À revoir" : on note la date de remise en concurrence (pas de checklist). */}
      {statut === 'à revoir' && (
        <label className="case-inline revoir-ligne">
          À remettre en concurrence le
          <input
            type="date"
            value={revoirLe(client, produit)}
            onChange={(e) => onDefinirRevoir(client, produit, e.target.value)}
          />
        </label>
      )}

      {/* "KO" : produit abandonné, rien à suivre. */}
      {statut === 'ko' && <p className="vide-doux">Produit abandonné.</p>}

      {/* Closé / en cours : assureur, options et checklist. */}
      {suivi && (
        <>
          <div className="produit-bloc-options">
            <label className="case-inline">
              Assureur
              <select
                value={(client.assureurParProduit || {})[produit] || ''}
                onChange={(e) => onDefinirAssureur(client, produit, e.target.value)}
              >
                <option value="">—</option>
                {ASSUREURS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            {produit === 'PER' && (
              <label className="case-inline">
                <input
                  type="checkbox"
                  checked={client.perVersements !== false}
                  onChange={() => onBasculerPerVersements(client)}
                />
                Versements en cours
              </label>
            )}
            {aRemplacement && (
              <label className="case-inline">
                <input
                  type="checkbox"
                  checked={!!(client.remplacementParProduit || {})[produit]}
                  onChange={() => onBasculerRemplacement(client, produit)}
                />
                En remplacement
              </label>
            )}
          </div>

          <div className="prod-progress">
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

          <div className="etapes-liste">
            {etapes.map((et) => (
              <EtapeLigne
                key={et.type}
                client={client}
                produit={produit}
                type={et.type}
                montantPrevu={montantPrevu}
                onAvancerEtape={onAvancerEtape}
                onDefinirStatutEtape={onDefinirStatutEtape}
                onMajChampEtape={onMajChampEtape}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Une étape : ligne cliquable (point = changer l'état) + chevron pour déplier les détails.
function EtapeLigne({
  client,
  produit,
  type,
  montantPrevu,
  onAvancerEtape,
  onDefinirStatutEtape,
  onMajChampEtape,
}) {
  const [ouvert, setOuvert] = useState(false)
  const na = etapeNonApplicable(client, produit, type)
  const etat = etatEtape(client, produit, type)
  const couleur = na ? 'na' : couleurEtape(type, etat.statut)
  const lettre = type.startsWith('Lettre')
  const labelMontant = champMontant(type)

  // Date clé affichée dans le résumé (à droite de la ligne).
  const dateCle = lettre
    ? etat.dateEnvoiPoste || etat.dateRetour || etat.dateEnvoiClient || ''
    : etat.date || ''

  // Alerte versement réel ≠ prévu (sur la mise en place des prélèvements).
  const ecartVersement =
    type === 'Mise en place prélèvements' &&
    etat.montant &&
    montantPrevu &&
    etat.montant !== montantPrevu

  return (
    <div className={`etape ${ouvert ? 'etape-ouverte' : ''}`}>
      <div className={`etape-chip etape-${couleur}`}>
        <button
          className="etape-statut"
          disabled={na}
          onClick={() => onAvancerEtape(client, produit, type)}
          title={na ? 'Non applicable' : 'Cliquer pour changer l\'état'}
        >
          <span className="etape-puce" />
          <span className="etape-label">{type}</span>
        </button>

        <span className="etape-resume">
          {na ? (
            'non applicable'
          ) : (
            <>
              {libelleEtat(etat.statut)}
              {dateCle && ` · ${formatDateFr(dateCle)}`}
              {etat.montant && ` · ${etat.montant} €`}
            </>
          )}
        </span>

        {!na && (
          <button
            className="etape-chevron"
            onClick={() => setOuvert((o) => !o)}
            title="Détails"
          >
            {ouvert ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
      </div>

      {ouvert && !na && (
        <div className="etape-detail">
          {/* États sélectionnables */}
          <div className="etape-etats">
            {etatsPossibles(type).map((s) => (
              <button
                key={s}
                className={`mini-etat ${etat.statut === s ? 'actif' : ''}`}
                onClick={() => onDefinirStatutEtape(client, produit, type, s)}
              >
                {libelleEtat(s)}
              </button>
            ))}
          </div>

          {/* Dates */}
          {lettre ? (
            <div className="etape-champs">
              <label>
                Envoyée au client
                <input
                  type="date"
                  value={etat.dateEnvoiClient || ''}
                  onChange={(e) =>
                    onMajChampEtape(client, produit, type, 'dateEnvoiClient', e.target.value)
                  }
                />
              </label>
              <label>
                Reçue signée
                <input
                  type="date"
                  value={etat.dateRetour || ''}
                  onChange={(e) =>
                    onMajChampEtape(client, produit, type, 'dateRetour', e.target.value)
                  }
                />
              </label>
              <label>
                Envoyée à la poste
                <input
                  type="date"
                  value={etat.dateEnvoiPoste || ''}
                  onChange={(e) =>
                    onMajChampEtape(client, produit, type, 'dateEnvoiPoste', e.target.value)
                  }
                />
              </label>
            </div>
          ) : (
            <div className="etape-champs">
              <label>
                Date
                <input
                  type="date"
                  value={etat.date || ''}
                  onChange={(e) => onMajChampEtape(client, produit, type, 'date', e.target.value)}
                />
              </label>
              {labelMontant && (
                <label>
                  {labelMontant}
                  <input
                    type="number"
                    value={etat.montant || ''}
                    onChange={(e) =>
                      onMajChampEtape(client, produit, type, 'montant', e.target.value)
                    }
                  />
                </label>
              )}
            </div>
          )}

          {ecartVersement && (
            <p className="alerte-ecart">
              ⚠️ Versement réel ({etat.montant} €) différent du prévu ({montantPrevu} €).
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Carte d'une démarche dans la fiche.
function DemarcheFiche({ demarche, montrerProduit, onModifier, onSupprimer }) {
  const termine = demarche.statut === STATUT_TERMINE
  return (
    <div className={`demarche-fiche ${termine ? 'terminee' : ''}`}>
      <div className="demarche-fiche-haut">
        <span className="demarche-type">
          {demarche.type}
          {montrerProduit && (
            <>
              {' · '}
              <span className="produit-tag">{demarche.produit}</span>
            </>
          )}
        </span>
        <div className="demarche-fiche-actions">
          <button className="btn-icone" title="Modifier" onClick={onModifier}>
            <Pencil size={15} />
          </button>
          <button className="btn-icone btn-icone-danger" title="Supprimer" onClick={onSupprimer}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {demarche.action && <div className="demarche-action">{demarche.action}</div>}
      <div className="demarche-fiche-bas">
        <span className={`date-pastille urgence-${urgence(demarche.date)}`}>
          {formatDateFr(demarche.date)}
        </span>
        <span className="statut-texte">{demarche.statut}</span>
      </div>
    </div>
  )
}

// Boutons d'avancement du parcours, qui changent selon la phase actuelle.
function Parcours({
  client,
  onPlacerRdv,
  onCloser,
  onNoShow,
  onARappeler,
  onARelancer,
  onPerdu,
  onReactiver,
}) {
  const { phase } = client

  if (phase === 'Perdu') {
    return (
      <div className="parcours-actions">
        <span className="vide-doux">Prospect perdu.</span>
        <button className="btn btn-gris" onClick={() => onReactiver(client)}>
          <RotateCcw size={16} /> Réactiver (R1)
        </button>
      </div>
    )
  }

  if (phase === 'Closé') {
    return (
      <div className="parcours-actions">
        <span className="vide-doux">Client closé.</span>
        <button className="btn btn-principal" onClick={() => onPlacerRdv('Point')}>
          <Calendar size={16} /> Placer un point
        </button>
      </div>
    )
  }

  // No-show ou "à rappeler" : le RDV doit être replacé. On affiche un encart dédié.
  if (client.aReprogrammer || client.aRappeler) {
    return (
      <div className="parcours-reprog">
        <div className="reprog-message">
          {client.aRappeler ? (
            <>
              <PhoneCall size={18} /> {phase} — à rappeler (n'a pas pu venir)
            </>
          ) : (
            <>
              <CalendarX size={18} /> {phase} à reprogrammer (no show)
            </>
          )}
        </div>
        <div className="parcours-actions">
          <button className="btn btn-principal" onClick={() => onPlacerRdv(phase)}>
            <ArrowRight size={16} /> Replacer le {phase}
          </button>
          <button className="btn btn-danger" onClick={() => onPerdu(client)}>
            <XCircle size={16} /> Perdu
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* En attente de relance (RDV passé, pas closé, doit voir son conseiller…) */}
      {client.relanceLe && (
        <div className="banniere-relance">
          <Clock size={16} /> Relance prévue le {formatDateFr(client.relanceLe)}
          {client.relanceMotif && ` · ${client.relanceMotif}`}
        </div>
      )}

      <div className="parcours-actions">
      {phase === 'R1' && (
        <button className="btn btn-principal" onClick={() => onPlacerRdv('R2')}>
          <ArrowRight size={16} /> Placer un R2
        </button>
      )}
      {phase === 'R2' && (
        <button className="btn btn-principal" onClick={() => onPlacerRdv('R3')}>
          <ArrowRight size={16} /> Placer un R3
        </button>
      )}

      {/* Closer est possible dès le R2 (ou R3, ou RDV ponctuel). */}
      {phase !== 'R1' && (
        <button className="btn btn-export" onClick={() => onCloser(client)}>
          <CheckCircle2 size={16} /> Closer
        </button>
      )}

      {/* RDV manqué : seulement pour un R2/R3 dont le RDV est fixé. */}
      {attendDocuments(phase) && client.prochainRdv && (
        <>
          <button className="btn btn-gris" onClick={() => onNoShow(client)}>
            <CalendarX size={16} /> No show
          </button>
          <button className="btn btn-gris" onClick={() => onARappeler(client)}>
            <PhoneCall size={16} /> À rappeler
          </button>
        </>
      )}

      {/* RDV passé, pas closé : mettre en attente avec une date de relance. */}
      {phase !== 'R1' && (
        <button className="btn btn-gris" onClick={() => onARelancer(client)}>
          <Clock size={16} /> {client.relanceLe ? 'Modifier la relance' : 'À relancer'}
        </button>
      )}

      {/* R1 KO = perdu (décision validée) ; sinon "marquer perdu". */}
      <button className="btn btn-danger" onClick={() => onPerdu(client)}>
        <XCircle size={16} /> {phase === 'R1' ? 'R1 KO (perdu)' : 'Perdu'}
      </button>
      </div>
    </>
  )
}
