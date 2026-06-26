// Logique du tunnel commercial (le "parcours" prospect → client).
// On regroupe ici tout ce qui dépend de la PHASE d'un client, pour que les
// composants d'affichage restent simples.

import { PHASES_AVEC_DOCS, ETAPES_PRODUIT, STATUT_TERMINE } from './constants.js'
import {
  joursRestants,
  decalerDate,
  formatDateFr,
  aujourdhui,
  minutesHeure,
  maintenantMinutes,
  urgence,
} from './dateUtils.js'

// Phases qui correspondent encore à un prospect "en cours" dans le tunnel.
const PHASES_PROSPECT = ['R1', 'R2', 'R3', 'RDV ponctuel']

// Badge "statut" affiché (Prospect / Client / Perdu) déduit de la phase.
export function infoStatut(phase) {
  if (phase === 'Closé') return { libelle: 'Client', couleur: 'vert' }
  if (phase === 'Perdu') return { libelle: 'Perdu', couleur: 'rouge' }
  return { libelle: 'Prospect', couleur: 'bleu' }
}

export function estProspect(phase) {
  return PHASES_PROSPECT.includes(phase)
}

export function attendDocuments(phase) {
  return PHASES_AVEC_DOCS.includes(phase)
}

// Un client compte comme "actif" tant qu'il n'est pas perdu.
export function estActif(client) {
  return client.phase !== 'Perdu'
}

// Le RDV du client est-il passé ? (sensible à l'heure : aujourd'hui, il n'est "passé"
// qu'une fois l'heure + la durée écoulées ; sans heure, on attend le lendemain.)
export function rdvPasse(client) {
  if (!client.prochainRdv) return false
  const auj = aujourdhui()
  if (client.prochainRdv < auj) return true
  if (client.prochainRdv === auj) {
    if (!client.prochainRdvHeure) return false
    const fin = minutesHeure(client.prochainRdvHeure) + (client.prochainRdvDuree || 60)
    return maintenantMinutes() >= fin
  }
  return false
}

// Le client a-t-il un RDV encore à venir (programmé et pas encore passé) ?
export function aUnRdvAVenir(client) {
  return !!client.prochainRdv && !rdvPasse(client)
}

// Génère les RAPPELS AUTOMATIQUES affichés dans la to-do, en plus des démarches.
// Deux types :
//  - 'docs'  : il manque les documents avant un R2/R3 (rappel dès 48h avant, persistant).
//  - 'suite' : un RDV est passé et il faut décider de la suite du parcours.
export function genererRappels(clients) {
  const rappels = []

  for (const c of clients) {
    // Rappel "à reprogrammer" : un R2/R3 a été marqué no-show.
    if (attendDocuments(c.phase) && c.aReprogrammer) {
      rappels.push({
        id: 'reprog-' + c.id,
        kind: 'reprog',
        clientId: c.id,
        nom: c.nom,
        date: aujourdhui(),
        action: `${c.phase} à reprogrammer (no show)`,
      })
      continue // tant qu'il n'est pas reprogrammé, pas d'autre rappel pour ce client.
    }

    // Rappel "à rappeler" : la cliente n'a pas pu venir au R2/R3, il faut la rappeler.
    if (attendDocuments(c.phase) && c.aRappeler) {
      rappels.push({
        id: 'rappel-' + c.id,
        kind: 'rappel',
        clientId: c.id,
        nom: c.nom,
        date: aujourdhui(),
        action: `${c.phase} — à rappeler (RDV manqué)`,
      })
      continue
    }

    // Préparation du R2/R3 : rappel dès 48h avant (J-2, J-1, jour J), en deux étapes.
    // 1) documents non reçus → envoyer un mail ; 2) docs reçus mais audit non fait → audit.
    // Échéance affichée = 24h avant le RDV (les docs doivent arriver avant).
    if (attendDocuments(c.phase) && c.prochainRdv && joursRestants(c.prochainRdv) <= 2) {
      const echeance = decalerDate(c.prochainRdv, -1)
      if (!c.docsRecus) {
        rappels.push({
          id: 'docs-' + c.id,
          kind: 'docs',
          clientId: c.id,
          nom: c.nom,
          email: c.email,
          rdv: c.prochainRdv,
          date: echeance,
          action: `Documents non reçus — envoyer un mail (RDV ${formatDateFr(c.prochainRdv)})`,
        })
      } else if (!c.auditFait) {
        rappels.push({
          id: 'audit-' + c.id,
          kind: 'audit',
          clientId: c.id,
          nom: c.nom,
          rdv: c.prochainRdv,
          date: echeance,
          action: `Documents reçus — faire l'audit avant le ${c.phase} (${formatDateFr(c.prochainRdv)})`,
        })
      }
    }

    // Rappel "suite du parcours" : un RDV (prospect) est passé sans qu'on ait fait avancer.
    if (estProspect(c.phase) && rdvPasse(c)) {
      const actions = {
        R1: 'R1 passé — placer un R2 ou marquer R1 KO',
        R2: 'R2 passé — closer, placer un R3 ou marquer perdu',
        R3: 'R3 passé — closer ou marquer perdu',
        'RDV ponctuel': 'RDV passé — à traiter',
      }
      rappels.push({
        id: 'suite-' + c.id,
        kind: 'suite',
        clientId: c.id,
        nom: c.nom,
        date: c.prochainRdv,
        action: actions[c.phase],
      })
    }

    // (Les compte-rendus ne sont PAS dans la to-do : ils ont leur propre bulle en haut,
    //  voir crsAFaire() utilisé dans ATraiter.)

    // Rappel "relance" : prospect mis en attente (ex. doit voir son conseiller),
    // avec une date de relance choisie. Remonte quand la date est arrivée.
    if (estActif(c) && c.relanceLe && joursRestants(c.relanceLe) <= 0) {
      rappels.push({
        id: 'relance-' + c.id,
        kind: 'relance',
        clientId: c.id,
        nom: c.nom,
        date: c.relanceLe,
        action: c.relanceMotif ? `Relancer — ${c.relanceMotif}` : 'Relancer (suite du RDV)',
      })
    }

    // (Les "points à placer" ne sont PAS dans la to-do : ils ont leur propre bande,
    //  voir aBesoinDePoint() utilisé dans ATraiter.)

    // Rappel "lettre non renvoyée" : une lettre envoyée au client il y a plus de 10 jours,
    // toujours pas reçue signée.
    for (const et of c.etapes || []) {
      if (estLettre(et.type) && et.statut === 'envoyée client' && et.dateEnvoiClient) {
        const joursEcoules = -joursRestants(et.dateEnvoiClient)
        if (joursEcoules >= SEUIL_RELANCE_LETTRE) {
          rappels.push({
            id: `lettre-${c.id}-${et.produit}-${et.type}`,
            kind: 'lettre',
            clientId: c.id,
            nom: c.nom,
            date: decalerDate(et.dateEnvoiClient, SEUIL_RELANCE_LETTRE),
            action: `${et.type} (${et.produit}) non renvoyée depuis ${joursEcoules} j — relancer`,
          })
        }
      }
    }
  }

  return rappels
}

// Construit la liste unifiée des "choses à faire" : démarches non terminées + rappels auto.
export function itemsToDo(clients, dems) {
  const nomParId = {}
  clients.forEach((c) => (nomParId[c.id] = c.nom))

  const items = dems
    .filter((d) => d.statut !== STATUT_TERMINE)
    .map((d) => ({
      key: 'dem-' + d.id,
      kind: 'demarche',
      date: d.date,
      demarche: d,
      nom: nomParId[d.clientId] || '(client supprimé)',
    }))

  genererRappels(clients).forEach((r) => items.push({ key: r.id, ...r }))
  return items
}

// Compte-rendus à faire : RDV passé (à partir du R2) dont le mail CR n'est pas envoyé.
// Présenté à part (bulle dédiée), pas dans la to-do classique.
export function crsAFaire(clients) {
  return clients
    .filter((c) => c.phase !== 'R1' && rdvPasse(c) && !c.mailCrEnvoye)
    .map((c) => ({ client: c, rdv: c.prochainRdv }))
}

// Nombre d'items urgents (en retard / aujourd'hui) + compte-rendus à faire.
// Sert au badge de l'onglet "À faire".
export function compterUrgents(clients, dems) {
  const urgents = itemsToDo(clients, dems).filter((it) => {
    const u = urgence(it.date)
    return u === 'retard' || u === 'aujourdhui'
  }).length
  return urgents + crsAFaire(clients).length
}

// ===== Checklist des étapes par produit =====

// Délai (en jours) au-delà duquel on relance un client qui n'a pas renvoyé sa lettre signée.
export const SEUIL_RELANCE_LETTRE = 10

// Les états successifs d'une lettre (qui passe par le client puis par la poste).
export const ETATS_LETTRE = ['à envoyer', 'envoyée client', 'reçue signée', 'envoyée poste']

// États personnalisés pour certaines étapes (en dehors des lettres et du simple fait/pas fait).
const ETATS_PERSO = {
  'Fiche découverte': ['à faire', 'remplie', 'envoyée'],
}

// Libellés affichés pour chaque état d'étape.
const LIBELLES_ETAT = {
  'à faire': 'À faire',
  fait: 'Fait',
  'à envoyer': 'À envoyer',
  'envoyée client': 'Chez le client',
  'reçue signée': 'Reçue signée',
  'envoyée poste': 'Envoyée à la poste',
  remplie: 'Remplie',
  envoyée: 'Envoyée au client',
}

// La liste ordonnée des états possibles d'une étape, selon son type.
export function etatsEtape(type) {
  if (estLettre(type)) return ETATS_LETTRE
  return ETATS_PERSO[type] || ['à faire', 'fait']
}

// ===== Statut par produit (Closé / À revoir / KO) =====

// Statuts possibles d'un produit, dans l'ordre du sélecteur.
export const STATUTS_PRODUIT = ['en cours', 'closé', 'à revoir', 'ko']

// Statut d'un produit pour un client (défaut : 'closé' si le client est closé, sinon 'en cours').
export function statutProduit(client, produit) {
  const m = client.statutProduit || {}
  if (m[produit]) return m[produit]
  return client.phase === 'Closé' ? 'closé' : 'en cours'
}

// Libellé + couleur d'un statut produit.
export function infoStatutProduit(statut) {
  if (statut === 'closé') return { libelle: 'Closé', couleur: 'vert' }
  if (statut === 'à revoir') return { libelle: 'À revoir', couleur: 'orange' }
  if (statut === 'ko') return { libelle: 'KO', couleur: 'rouge' }
  return { libelle: 'En cours', couleur: 'bleu' }
}

// Le suivi (checklist + barre) est-il pertinent pour ce statut ? (pas pour à revoir / ko)
export function produitSuivi(statut) {
  return statut === 'closé' || statut === 'en cours'
}

// Date de remise en concurrence d'un produit "à revoir" (ou '').
export function revoirLe(client, produit) {
  return (client.revoirParProduit || {})[produit] || ''
}

// Étapes type d'un produit (checklist de mise en place).
export function etapesProduit(produit) {
  return ETAPES_PRODUIT[produit] || [{ type: 'Souscription' }]
}

// Une lettre = étape qui suit le circuit client → poste.
export function estLettre(type) {
  return type.startsWith('Lettre')
}

// État par défaut d'une étape jamais touchée (= son premier état).
export function etatParDefaut(type) {
  return etatsEtape(type)[0]
}

// Récupère l'état d'une étape pour un client (ou l'état par défaut).
export function etatEtape(client, produit, type) {
  const e = (client.etapes || []).find((x) => x.produit === produit && x.type === type)
  return e || { produit, type, statut: etatParDefaut(type), dateEnvoiClient: '' }
}

// L'étape est-elle "terminée" (verte) ? = son dernier état.
export function etapeFaite(type, statut) {
  const etats = etatsEtape(type)
  return statut === etats[etats.length - 1]
}

// Une étape non applicable : PER sans versement (lettre d'arrêt inutile),
// ou étape "remplacement seulement" alors que le contrat n'est pas un remplacement.
export function etapeNonApplicable(client, produit, type) {
  if (produit === 'PER' && type === 'Lettre arrêt versement' && client.perVersements === false) {
    return true
  }
  const modele = etapesProduit(produit).find((e) => e.type === type)
  if (modele && modele.remplacementSeulement) {
    return !(client.remplacementParProduit || {})[produit]
  }
  return false
}

// Couleur d'une étape selon son état : rouge (1er état) → orange (milieu) → vert (dernier).
export function couleurEtape(type, statut) {
  const etats = etatsEtape(type)
  if (statut === etats[etats.length - 1]) return 'vert'
  if (statut === etats[0]) return 'rouge'
  return 'orange'
}

// Libellé lisible d'un état.
export function libelleEtat(statut) {
  return LIBELLES_ETAT[statut] || statut
}

// État suivant quand on clique sur une étape (cycle dans la liste de ses états).
export function prochainEtat(type, statut) {
  const etats = etatsEtape(type)
  const i = etats.indexOf(statut)
  return etats[(i + 1) % etats.length]
}

// Les états sélectionnables d'une étape (pour le panneau déplié).
export function etatsPossibles(type) {
  return etatsEtape(type)
}

// Libellé du champ montant d'une étape (ou null si l'étape n'a pas de montant).
export function champMontant(type) {
  if (type === 'Souscription') return 'Versement prévu (€)'
  if (type === 'Mise en place prélèvements') return 'Versement réel (€)'
  if (type === 'Transfert PER') return 'Montant transféré (€)'
  return null
}

// Toutes les étapes applicables d'un client (produit × type), hors étapes non applicables.
export function etapesApplicables(client) {
  const list = []
  for (const p of client.produits || []) {
    for (const e of etapesProduit(p)) {
      if (!etapeNonApplicable(client, p, e.type)) list.push({ produit: p, type: e.type })
    }
  }
  return list
}

// Nombre d'étapes pas encore terminées (pour l'aperçu sur la carte client).
export function nbEtapesAFaire(client) {
  return etapesApplicables(client).filter(({ produit, type }) => {
    const et = etatEtape(client, produit, type)
    return !etapeFaite(type, et.statut)
  }).length
}

// Progression d'un produit : { faites, total } sur ses étapes applicables.
export function progressionProduit(client, produit) {
  const etapes = etapesProduit(produit).filter((e) => !etapeNonApplicable(client, produit, e.type))
  const faites = etapes.filter((e) => etapeFaite(e.type, etatEtape(client, produit, e.type).statut))
  return { faites: faites.length, total: etapes.length }
}

// Un client/prospect actif n'a-t-il aucun rendez-vous à venir ? (→ "point à placer")
// (Pas concerné si déjà no-show / à rappeler / en attente de relance.)
export function pointManquant(client) {
  if (!estActif(client) || client.aReprogrammer || client.aRappeler || client.relanceLe) {
    return false
  }
  return !aUnRdvAVenir(client)
}

// Doit-il apparaître dans la bande "Points à placer" ?
// = aucun RDV à venir, et pas déjà couvert ailleurs (no-show, à rappeler, ou prospect dont
//   le RDV est passé → géré par le rappel 'suite' dans la to-do).
export function aBesoinDePoint(client) {
  if (!pointManquant(client)) return false
  const suiteDejaGeree = estProspect(client.phase) && rdvPasse(client)
  return !suiteDejaGeree
}
