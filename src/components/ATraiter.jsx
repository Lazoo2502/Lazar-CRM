import {
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  Check,
  Pencil,
  FileClock,
  GitBranch,
  ArrowRight,
  CalendarX,
  Mail,
  ClipboardCheck,
  Send,
  ArrowLeftRight,
  CalendarPlus,
  PhoneCall,
} from 'lucide-react'
import { STATUTS_DEMARCHE } from '../constants.js'
import {
  urgence,
  formatDateFr,
  formatHeure,
  joursRestants,
  LIBELLE_URGENCE,
} from '../dateUtils.js'
import { itemsToDo, estActif, etatEtape, aBesoinDePoint, crsAFaire } from '../pipeline.js'

// Ordre d'affichage des groupes d'urgence.
const ORDRE = ['retard', 'aujourdhui', 'semaine', 'plustard']

export default function ATraiter({
  clients,
  dems,
  onChangerStatut,
  onTerminer,
  onModifierDemarche,
  onOuvrirClient,
  onDocsRecus,
  onAuditFait,
  onAjouterAudit,
  onMailCrEnvoye,
}) {
  // Démarches non terminées + rappels automatiques (helper partagé avec le badge d'onglet).
  const items = itemsToDo(clients, dems)

  // Compte-rendus à faire (RDV passés) → bulle dédiée en haut, séparée de la to-do.
  const crs = crsAFaire(clients)

  // Tri par date croissante, puis regroupement par urgence.
  items.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const groupes = { retard: [], aujourdhui: [], semaine: [], plustard: [] }
  items.forEach((it) => groupes[urgence(it.date)].push(it))

  // Compteurs du haut.
  const nbRetard = groupes.retard.length
  const nbAujourdhui = groupes.aujourdhui.length
  const nbClientsActifs = clients.filter(estActif).length

  // Bande des prochains rendez-vous (clients avec un RDV aujourd'hui ou plus tard).
  const prochainsRdv = clients
    .filter((c) => c.prochainRdv && joursRestants(c.prochainRdv) >= 0)
    .sort((a, b) => a.prochainRdv.localeCompare(b.prochainRdv))

  // Points à placer : clients/prospects actifs sans aucun RDV à venir (hors no-show / suite).
  // Affichés dans une bande dédiée, pas dans la to-do urgente.
  const pointsAPlacer = clients.filter(aBesoinDePoint)

  // Transferts PER à faire : souscription faite (verte) mais transfert pas encore fait.
  // (Non urgent : on l'affiche à part, pas dans les groupes d'urgence.)
  const transfertsAFaire = clients.filter(
    (c) =>
      (c.produits || []).includes('PER') &&
      etatEtape(c, 'PER', 'Souscription').statut === 'fait' &&
      etatEtape(c, 'PER', 'Transfert PER').statut !== 'fait',
  )

  return (
    <div className="vue">
      {/* Bulle "compte-rendus à faire" : RDV passés, à traiter rapidement */}
      {crs.length > 0 && (
        <div className="bulle-cr">
          <div className="bulle-cr-titre">
            <Mail size={18} /> Compte-rendus à faire
            <span className="groupe-compte">{crs.length}</span>
          </div>
          <p className="bulle-cr-texte">
            Ces rendez-vous sont passés — as-tu envoyé le compte-rendu (mail CR + lettre +
            fiche) ?
          </p>
          <div className="bulle-cr-liste">
            {crs.map(({ client, rdv }) => (
              <div key={client.id} className="cr-ligne">
                <button className="lien-client" onClick={() => onOuvrirClient(client.id)}>
                  {client.nom}
                </button>
                <span className="cr-date">RDV du {formatDateFr(rdv)}</span>
                <div className="cr-actions">
                  {client.email && (
                    <a
                      className="btn btn-gris btn-petit"
                      href={`mailto:${client.email}?subject=Compte-rendu de notre rendez-vous`}
                    >
                      <Mail size={14} /> Mail
                    </a>
                  )}
                  <button className="btn-terminer" onClick={() => onMailCrEnvoye(client.id)}>
                    <Check size={15} /> CR fait
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compteurs */}
      <div className="compteurs">
        <div className="compteur compteur-rouge">
          <AlertTriangle size={22} />
          <div>
            <div className="compteur-nombre">{nbRetard}</div>
            <div className="compteur-libelle">En retard</div>
          </div>
        </div>
        <div className="compteur compteur-orange">
          <Clock size={22} />
          <div>
            <div className="compteur-nombre">{nbAujourdhui}</div>
            <div className="compteur-libelle">Aujourd'hui</div>
          </div>
        </div>
        <div className="compteur compteur-bleu">
          <Users size={22} />
          <div>
            <div className="compteur-nombre">{nbClientsActifs}</div>
            <div className="compteur-libelle">Clients actifs</div>
          </div>
        </div>
      </div>

      {/* Bande des prochains rendez-vous */}
      <div className="bande-rdv">
        <div className="bande-rdv-titre">
          <Calendar size={16} /> Prochains rendez-vous
        </div>
        {prochainsRdv.length === 0 ? (
          <span className="vide-doux">Aucun rendez-vous à venir</span>
        ) : (
          <div className="bande-rdv-liste">
            {prochainsRdv.map((c) => (
              <button key={c.id} className="puce-rdv" onClick={() => onOuvrirClient(c.id)}>
                <strong>
                  {c.nom} <span className="puce-phase">{c.phase}</span>
                </strong>
                <span>
                  {formatDateFr(c.prochainRdv)}
                  {c.prochainRdvHeure && ` · ${formatHeure(c.prochainRdvHeure)}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Points à placer (informatif, hors to-do urgente) */}
      {pointsAPlacer.length > 0 && (
        <div className="bande-rdv bande-points">
          <div className="bande-rdv-titre">
            <CalendarPlus size={16} /> Points à placer
            <span className="groupe-compte">{pointsAPlacer.length}</span>
          </div>
          <div className="bande-rdv-liste">
            {pointsAPlacer.map((c) => (
              <button key={c.id} className="puce-rdv" onClick={() => onOuvrirClient(c.id)}>
                <strong>
                  {c.nom} <span className="puce-phase">{c.phase}</span>
                </strong>
                <span>aucun RDV</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transferts PER à faire (informatif, non urgent) */}
      {transfertsAFaire.length > 0 && (
        <div className="bande-rdv bande-transferts">
          <div className="bande-rdv-titre">
            <ArrowLeftRight size={16} /> Transferts PER à faire
            <span className="groupe-compte">{transfertsAFaire.length}</span>
          </div>
          <div className="bande-rdv-liste">
            {transfertsAFaire.map((c) => {
              const t = etatEtape(c, 'PER', 'Transfert PER')
              return (
                <button key={c.id} className="puce-rdv" onClick={() => onOuvrirClient(c.id)}>
                  <strong>{c.nom}</strong>
                  <span>{t.montant ? `${t.montant} €` : 'montant à définir'}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Liste des items par groupe d'urgence */}
      {items.length === 0 && (
        <div className="bloc-vide">🎉 Rien à faire pour le moment. Tout est à jour !</div>
      )}

      {ORDRE.map((cle) =>
        groupes[cle].length === 0 ? null : (
          <section key={cle} className="groupe">
            <h3 className={`groupe-titre urgence-${cle}`}>
              {LIBELLE_URGENCE[cle]}
              <span className="groupe-compte">{groupes[cle].length}</span>
            </h3>

            <div className="liste-demarches">
              {groupes[cle].map((it) => {
                if (it.kind === 'demarche') {
                  return (
                    <LigneDemarche
                      key={it.key}
                      demarche={it.demarche}
                      nomClient={it.nom}
                      onChangerStatut={onChangerStatut}
                      onTerminer={onTerminer}
                      onModifier={() => onModifierDemarche(it.demarche)}
                      onOuvrirClient={() => onOuvrirClient(it.demarche.clientId)}
                    />
                  )
                }
                return (
                  <LigneRappel
                    key={it.key}
                    rappel={it}
                    onDocsRecus={() => onDocsRecus(it.clientId)}
                    onAuditFait={() => onAuditFait(it.clientId)}
                    onAjouterAudit={() => onAjouterAudit(it.clientId)}
                    onOuvrirClient={() => onOuvrirClient(it.clientId)}
                  />
                )
              })}
            </div>
          </section>
        ),
      )}
    </div>
  )
}

// Ligne d'une démarche manuelle (souscription, transfert, etc.).
function LigneDemarche({
  demarche,
  nomClient,
  onChangerStatut,
  onTerminer,
  onModifier,
  onOuvrirClient,
}) {
  const u = urgence(demarche.date)
  const j = joursRestants(demarche.date)
  let infoDate = formatDateFr(demarche.date)
  if (u === 'retard') infoDate += ` · ${Math.abs(j)} j de retard`

  return (
    <div className="demarche">
      <div className="demarche-gauche">
        <button className="lien-client" onClick={onOuvrirClient}>
          {nomClient}
        </button>
        <div className="demarche-type">
          {demarche.type} · <span className="produit-tag">{demarche.produit}</span>
        </div>
        {demarche.action && <div className="demarche-action">{demarche.action}</div>}
      </div>

      <div className="demarche-droite">
        <span className={`date-pastille urgence-${u}`}>{infoDate}</span>
        <select
          className="select-statut"
          value={demarche.statut}
          onChange={(e) => onChangerStatut(demarche.id, e.target.value)}
        >
          {STATUTS_DEMARCHE.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button className="btn-icone" title="Modifier la démarche" onClick={onModifier}>
          <Pencil size={16} />
        </button>
        <button
          className="btn-terminer"
          title="Marquer comme terminé"
          onClick={() => onTerminer(demarche.id)}
        >
          <Check size={16} /> Terminé
        </button>
      </div>
    </div>
  )
}

// Étiquette (icône + texte) selon le type de rappel automatique.
function enteteRappel(kind) {
  if (kind === 'docs') return { Ico: FileClock, texte: 'Documents' }
  if (kind === 'audit') return { Ico: ClipboardCheck, texte: 'Audit' }
  if (kind === 'reprog') return { Ico: CalendarX, texte: 'À reprogrammer' }
  if (kind === 'lettre') return { Ico: Send, texte: 'Relance lettre' }
  if (kind === 'rappel') return { Ico: PhoneCall, texte: 'À rappeler' }
  if (kind === 'relance') return { Ico: Clock, texte: 'Relance' }
  return { Ico: GitBranch, texte: 'Suite du parcours' }
}

// Ligne d'un rappel automatique : documents (mail), audit, no-show, ou suite du parcours.
function LigneRappel({ rappel, onDocsRecus, onAuditFait, onAjouterAudit, onOuvrirClient }) {
  const u = urgence(rappel.date)
  const { Ico, texte } = enteteRappel(rappel.kind)

  return (
    <div className={`demarche demarche-rappel rappel-${rappel.kind}`}>
      <div className="demarche-gauche">
        <button className="lien-client" onClick={onOuvrirClient}>
          {rappel.nom}
        </button>
        <div className="demarche-type">
          <Ico size={14} className="ico-inline" /> {texte}
          <span className="etiquette-auto">automatique</span>
        </div>
        <div className="demarche-action">{rappel.action}</div>
      </div>

      <div className="demarche-droite">
        <span className={`date-pastille urgence-${u}`}>{formatDateFr(rappel.date)}</span>

        {rappel.kind === 'docs' && (
          <>
            {rappel.email && (
              <a
                className="btn btn-gris btn-petit"
                href={`mailto:${rappel.email}?subject=Vos documents avant notre rendez-vous`}
              >
                <Mail size={15} /> Envoyer un mail
              </a>
            )}
            <button className="btn-terminer" title="Documents reçus" onClick={onDocsRecus}>
              <Check size={16} /> Docs reçus
            </button>
          </>
        )}

        {rappel.kind === 'audit' && (
          <>
            <button className="btn btn-gris btn-petit" onClick={onAjouterAudit}>
              <ArrowRight size={15} /> Ajouter aux démarches
            </button>
            <button className="btn-terminer" title="Audit fait" onClick={onAuditFait}>
              <Check size={16} /> Audit fait
            </button>
          </>
        )}

        {(rappel.kind === 'reprog' ||
          rappel.kind === 'suite' ||
          rappel.kind === 'lettre' ||
          rappel.kind === 'rappel' ||
          rappel.kind === 'relance') && (
          <button className="btn btn-gris btn-petit" onClick={onOuvrirClient}>
            <ArrowRight size={15} /> Ouvrir la fiche
          </button>
        )}
      </div>
    </div>
  )
}
