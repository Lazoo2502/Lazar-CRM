import { useState, useEffect } from 'react'
import { ListTodo, CalendarDays, UserPlus, UserCheck, Download, LogOut } from 'lucide-react'

import { supabase } from './supabase.js'
import Connexion from './components/Connexion.jsx'
import { chargerDonnees, sauvegarder, importerDepuisLocal, lireLocal } from './storage.js'
import { exporterExcel } from './excel.js'
import { STATUT_TERMINE } from './constants.js'
import { aujourdhui } from './dateUtils.js'

import ATraiter from './components/ATraiter.jsx'
import Agenda from './components/Agenda.jsx'
import Clients from './components/Clients.jsx'
import ClientPanel from './components/ClientPanel.jsx'
import ClientModal from './components/ClientModal.jsx'
import DemarcheModal from './components/DemarcheModal.jsx'
import PlacerRdvModal from './components/PlacerRdvModal.jsx'
import RelanceModal from './components/RelanceModal.jsx'
import {
  etatEtape,
  etatParDefaut,
  prochainEtat,
  estLettre,
  etatsPossibles,
  compterUrgents,
} from './pipeline.js'

// Génère un identifiant unique simple.
function nouvelId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export default function App() {
  // --- Authentification ---
  const [session, setSession] = useState(null)
  const [sessionChargee, setSessionChargee] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionChargee(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evenement, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // --- Données principales ---
  const [clients, setClients] = useState([])
  const [dems, setDems] = useState([])
  const [chargement, setChargement] = useState(true)
  const [nbAImporter, setNbAImporter] = useState(0) // données locales à importer

  // Chargement depuis Supabase, une fois connecté.
  useEffect(() => {
    if (!session) return
    let actif = true
    setChargement(true)
    chargerDonnees()
      .then(async (d) => {
        if (!actif) return
        setClients(d.clients)
        setDems(d.dems)
        setChargement(false)
        // Base vide → propose d'importer les anciennes données locales s'il y en a.
        if (d.clients.length === 0) {
          const local = await lireLocal()
          if (actif) setNbAImporter(local.clients.length)
        }
      })
      .catch(() => {
        if (actif) setChargement(false)
      })
    return () => {
      actif = false
    }
  }, [session])

  // Sauvegarde automatique à chaque modification (une fois connecté et chargé).
  useEffect(() => {
    if (chargement || !session) return
    sauvegarder(clients, dems)
  }, [clients, dems, chargement, session])

  // Importe les données locales dans Supabase puis recharge.
  async function importerLocal() {
    await importerDepuisLocal()
    const d = await chargerDonnees()
    setClients(d.clients)
    setDems(d.dems)
    setNbAImporter(0)
  }

  // --- État de l'interface ---
  const [onglet, setOnglet] = useState('afaire') // 'afaire' | 'clients'
  const [recherche, setRecherche] = useState('')
  const [clientOuvertId, setClientOuvertId] = useState(null)

  // Modales : null = fermée. Sinon contient les infos d'édition.
  const [modalClient, setModalClient] = useState(null) // { client? }
  const [modalDemarche, setModalDemarche] = useState(null) // { demarche?, clientIdParDefaut? }
  const [modalRdv, setModalRdv] = useState(null) // { client, cible: 'R2' | 'R3' | 'Point' }
  const [modalRelance, setModalRelance] = useState(null) // { client }

  const clientOuvert = clients.find((c) => c.id === clientOuvertId) || null

  // Nombre d'urgences (en retard / aujourd'hui) → badge sur l'onglet "À faire".
  const nbUrgents = compterUrgents(clients, dems)

  // Petite aide : modifier un client par son id (immuable).
  function modifierClient(id, changements) {
    setClients((liste) => liste.map((c) => (c.id === id ? { ...c, ...changements } : c)))
  }

  // ===== Actions CLIENTS =====
  function ouvrirNouveauClient() {
    setModalClient({ client: null })
  }

  function enregistrerClient(form) {
    if (form.id) {
      // Modification
      setClients((liste) => liste.map((c) => (c.id === form.id ? form : c)))
    } else {
      // Création
      const nouveau = { ...form, id: nouvelId() }
      setClients((liste) => [...liste, nouveau])
    }
    setModalClient(null)
  }

  function supprimerClient(client) {
    const nbDems = dems.filter((d) => d.clientId === client.id).length
    const message =
      `Supprimer définitivement le client « ${client.nom} » ?` +
      (nbDems > 0 ? `\nSes ${nbDems} démarche(s) seront aussi supprimées.` : '')
    if (!window.confirm(message)) return

    setClients((liste) => liste.filter((c) => c.id !== client.id))
    setDems((liste) => liste.filter((d) => d.clientId !== client.id))
    if (clientOuvertId === client.id) setClientOuvertId(null)
  }

  // ===== Actions PARCOURS (tunnel commercial) =====

  // Place un R2 ou un R3 : on change la phase, on fixe la date du RDV,
  // et le suivi des documents repart de zéro (docsRecus = false).
  function confirmerPlacerRdv(date, heure, duree) {
    if (!modalRdv) return
    if (modalRdv.cible === 'Point') {
      // Point de situation (client déjà closé) : on fixe juste la date/heure, sans toucher à la phase.
      modifierClient(modalRdv.client.id, {
        prochainRdv: date,
        prochainRdvHeure: heure || '',
        prochainRdvDuree: duree || 60,
        mailCrEnvoye: false, // un CR sera attendu après ce nouveau point
      })
    } else {
      modifierClient(modalRdv.client.id, {
        phase: modalRdv.cible,
        prochainRdv: date,
        prochainRdvHeure: heure || '',
        prochainRdvDuree: duree || 60,
        mailCrEnvoye: false,
        docsRecus: false,
        aReprogrammer: false, // placer un RDV annule les états no-show / à rappeler / relance.
        aRappeler: false,
        relanceLe: '',
        relanceMotif: '',
      })
    }
    setModalRdv(null)
  }

  // No-show : le RDV (R2/R3) n'a pas eu lieu → il passe en "à reprogrammer".
  function marquerNoShow(client) {
    modifierClient(client.id, {
      aReprogrammer: true,
      aRappeler: false,
      prochainRdv: '',
      prochainRdvHeure: '',
      docsRecus: false,
    })
  }

  // À rappeler : la cliente n'a pas pu venir → on doit la rappeler pour replacer un point.
  function marquerARappeler(client) {
    modifierClient(client.id, {
      aRappeler: true,
      aReprogrammer: false,
      prochainRdv: '',
      prochainRdvHeure: '',
      docsRecus: false,
    })
  }

  // Closer un client : il passe en "Closé". La mise en place se suit ensuite via la
  // checklist par produit sur sa fiche (plus de création de démarches au closing).
  function closerClient(client) {
    if (!window.confirm(`Closer « ${client.nom} » ? Il devient client.`)) return
    modifierClient(client.id, { phase: 'Closé', relanceLe: '', relanceMotif: '' })
  }

  // À relancer : RDV passé, pas closé/pas de R3 → mise en attente avec une date choisie.
  function confirmerRelance(date, motif) {
    if (!modalRelance) return
    modifierClient(modalRelance.client.id, {
      relanceLe: date,
      relanceMotif: motif,
      prochainRdv: '',
      prochainRdvHeure: '',
      aReprogrammer: false,
      aRappeler: false,
    })
    setModalRelance(null)
  }

  // Marquer perdu (inclut le cas "R1 KO").
  function marquerPerdu(client) {
    const message =
      client.phase === 'R1'
        ? `Marquer « ${client.nom} » en R1 KO (perdu) ?`
        : `Marquer « ${client.nom} » comme perdu ?`
    if (!window.confirm(message)) return
    modifierClient(client.id, { phase: 'Perdu', relanceLe: '', relanceMotif: '' })
  }

  // Réactiver un prospect perdu : il repart en R1.
  function reactiverClient(client) {
    modifierClient(client.id, { phase: 'R1' })
  }

  // Coche / décoche "documents reçus".
  function basculerDocs(client) {
    modifierClient(client.id, { docsRecus: !client.docsRecus })
  }

  // Coche / décoche "audit fait".
  function basculerAudit(client) {
    modifierClient(client.id, { auditFait: !client.auditFait })
  }

  // Depuis la to-do : bouton "Docs reçus" (met simplement docsRecus à true).
  function marquerDocsRecus(clientId) {
    modifierClient(clientId, { docsRecus: true })
  }

  // Depuis la to-do : bouton "Audit fait".
  function marquerAuditFait(clientId) {
    modifierClient(clientId, { auditFait: true })
  }

  // Depuis la to-do : bouton "Mail CR envoyé".
  function marquerMailCrEnvoye(clientId) {
    modifierClient(clientId, { mailCrEnvoye: true })
  }

  // Depuis la to-do : "Ajouter l'audit à mes démarches" → crée une démarche Audit
  // et marque l'audit comme pris en charge (il sort de la relance, il est dans la to-do).
  function ajouterAuditAuxDemarches(clientId) {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return
    const dem = {
      id: nouvelId(),
      clientId,
      type: 'Audit',
      produit: (client.produits && client.produits[0]) || 'PER',
      statut: 'À faire',
      action: `Faire l'audit patrimonial avant le ${client.phase}`,
      date: aujourdhui(),
      notes: '',
    }
    setDems((liste) => [...liste, dem])
    modifierClient(clientId, { auditFait: true })
  }

  // ===== Actions DÉMARCHES =====
  function ouvrirNouvelleDemarcheDepuisFiche(produit) {
    setModalDemarche({
      demarche: null,
      clientIdParDefaut: clientOuvertId,
      produitParDefaut: produit,
    })
  }

  // Met à jour (ou crée) une étape de la checklist d'un produit, en fusionnant un "patch".
  function majEtape(client, produit, type, patch) {
    const etapes = [...(client.etapes || [])]
    const i = etapes.findIndex((e) => e.produit === produit && e.type === type)
    const base = i >= 0 ? etapes[i] : { produit, type, statut: etatParDefaut(type) }
    const nouvel = { ...base, ...patch }
    if (i >= 0) etapes[i] = nouvel
    else etapes.push(nouvel)
    modifierClient(client.id, { etapes })
  }

  // Fixe l'état d'une étape et estampille automatiquement la date correspondante.
  function definirStatutEtape(client, produit, type, statut) {
    const courant = etatEtape(client, produit, type)
    const auj = aujourdhui()
    const patch = { statut }
    if (estLettre(type)) {
      if (statut === 'envoyée client') patch.dateEnvoiClient = courant.dateEnvoiClient || auj
      if (statut === 'reçue signée') patch.dateRetour = courant.dateRetour || auj
      if (statut === 'envoyée poste') patch.dateEnvoiPoste = courant.dateEnvoiPoste || auj
      if (statut === 'à envoyer') {
        patch.dateEnvoiClient = ''
        patch.dateRetour = ''
        patch.dateEnvoiPoste = ''
      }
    } else {
      // Date posée automatiquement quand l'étape atteint son dernier état (= terminée).
      const etats = etatsPossibles(type)
      const terminee = statut === etats[etats.length - 1]
      patch.date = terminee ? courant.date || auj : ''
    }
    majEtape(client, produit, type, patch)
  }

  // Clic sur le point d'une étape → état suivant (toggle simple, ou cycle pour les lettres).
  function avancerEtape(client, produit, type) {
    const courant = etatEtape(client, produit, type)
    definirStatutEtape(client, produit, type, prochainEtat(type, courant.statut))
  }

  // Édition d'un champ d'une étape (date, montant…) depuis le panneau déplié.
  function majChampEtape(client, produit, type, champ, valeur) {
    majEtape(client, produit, type, { [champ]: valeur })
  }

  // Choix de l'assureur d'un produit.
  function definirAssureur(client, produit, assureur) {
    const courant = client.assureurParProduit || {}
    modifierClient(client.id, { assureurParProduit: { ...courant, [produit]: assureur } })
  }

  // Statut d'un produit (Closé / À revoir / KO / En cours).
  function definirStatutProduit(client, produit, statut) {
    const courant = client.statutProduit || {}
    const changements = { statutProduit: { ...courant, [produit]: statut } }
    // Closer un produit fait passer le client en "Client".
    if (statut === 'closé') changements.phase = 'Closé'
    // Si on quitte "à revoir", on efface la date de remise en concurrence.
    if (statut !== 'à revoir') {
      const r = { ...(client.revoirParProduit || {}) }
      delete r[produit]
      changements.revoirParProduit = r
    }
    modifierClient(client.id, changements)
  }

  // Date de remise en concurrence d'un produit "à revoir".
  function definirRevoir(client, produit, date) {
    const courant = client.revoirParProduit || {}
    modifierClient(client.id, { revoirParProduit: { ...courant, [produit]: date } })
  }

  // Case "Versements en cours ?" sur le PER.
  function basculerPerVersements(client) {
    modifierClient(client.id, { perVersements: !(client.perVersements !== false) })
  }

  // Case "En remplacement ?" sur un produit (Prévoyance/Mutuelle/Emprunteur).
  function basculerRemplacement(client, produit) {
    const courant = client.remplacementParProduit || {}
    modifierClient(client.id, {
      remplacementParProduit: { ...courant, [produit]: !courant[produit] },
    })
  }

  function enregistrerDemarche(form) {
    if (form.id) {
      setDems((liste) => liste.map((d) => (d.id === form.id ? form : d)))
    } else {
      const nouvelle = { ...form, id: nouvelId() }
      setDems((liste) => [...liste, nouvelle])
    }
    setModalDemarche(null)
  }

  function supprimerDemarche(demarche) {
    if (!window.confirm('Supprimer définitivement cette démarche ?')) return
    setDems((liste) => liste.filter((d) => d.id !== demarche.id))
  }

  function changerStatutDemarche(demId, statut) {
    setDems((liste) => liste.map((d) => (d.id === demId ? { ...d, statut } : d)))
  }

  function terminerDemarche(demId) {
    changerStatutDemarche(demId, STATUT_TERMINE)
  }

  // ===== Navigation depuis la to-do vers une fiche client =====
  function ouvrirClient(clientId) {
    setClientOuvertId(clientId)
  }

  // Modifier l'heure d'un RDV directement depuis l'agenda.
  function definirHeureRdv(client, heure) {
    modifierClient(client.id, { prochainRdvHeure: heure })
  }

  // Modifier la durée d'un RDV directement depuis l'agenda.
  function definirDureeRdv(client, duree) {
    modifierClient(client.id, { prochainRdvDuree: duree })
  }

  // Tant qu'on ne sait pas si l'utilisateur est connecté.
  if (!sessionChargee) {
    return <div className="chargement">Chargement…</div>
  }
  // Pas connecté → écran de connexion.
  if (!session) {
    return <Connexion />
  }

  if (chargement) {
    return <div className="chargement">Chargement…</div>
  }

  return (
    <div className="app">
      {/* En-tête + navigation par onglets */}
      <header className="entete">
        <div className="entete-haut">
          <h1>CRM Patrimoine</h1>
          <div className="entete-actions">
            <button className="btn btn-export" onClick={() => exporterExcel(clients, dems)}>
              <Download size={18} /> Exporter en Excel
            </button>
            <button
              className="btn btn-gris"
              onClick={() => supabase.auth.signOut()}
              title="Se déconnecter"
            >
              <LogOut size={18} /> Déconnexion
            </button>
          </div>
        </div>
        <nav className="onglets">
          <button
            className={onglet === 'afaire' ? 'onglet actif' : 'onglet'}
            onClick={() => setOnglet('afaire')}
          >
            <ListTodo size={18} /> À faire
            {nbUrgents > 0 && <span className="onglet-badge">{nbUrgents}</span>}
          </button>
          <button
            className={onglet === 'agenda' ? 'onglet actif' : 'onglet'}
            onClick={() => setOnglet('agenda')}
          >
            <CalendarDays size={18} /> Agenda
          </button>
          <button
            className={onglet === 'prospects' ? 'onglet actif' : 'onglet'}
            onClick={() => {
              setOnglet('prospects')
              setRecherche('')
            }}
          >
            <UserPlus size={18} /> Prospects
          </button>
          <button
            className={onglet === 'clients' ? 'onglet actif' : 'onglet'}
            onClick={() => {
              setOnglet('clients')
              setRecherche('')
            }}
          >
            <UserCheck size={18} /> Clients
          </button>
        </nav>
      </header>

      <main className="contenu">
        {nbAImporter > 0 && (
          <div className="import-banner">
            <span>
              📦 Tu as <strong>{nbAImporter} client(s)</strong> enregistrés en local. Les
              importer dans ta base en ligne ?
            </span>
            <button className="btn btn-principal btn-petit" onClick={importerLocal}>
              Importer dans Supabase
            </button>
          </div>
        )}

        {onglet === 'afaire' && (
          <ATraiter
            clients={clients}
            dems={dems}
            onChangerStatut={changerStatutDemarche}
            onTerminer={terminerDemarche}
            onModifierDemarche={(d) => setModalDemarche({ demarche: d })}
            onOuvrirClient={ouvrirClient}
            onDocsRecus={marquerDocsRecus}
            onAuditFait={marquerAuditFait}
            onAjouterAudit={ajouterAuditAuxDemarches}
            onMailCrEnvoye={marquerMailCrEnvoye}
          />
        )}

        {onglet === 'agenda' && (
          <Agenda
            clients={clients}
            onOuvrirClient={ouvrirClient}
            onDefinirHeure={definirHeureRdv}
            onDefinirDuree={definirDureeRdv}
          />
        )}

        {(onglet === 'prospects' || onglet === 'clients') && (
          <Clients
            clients={clients}
            dems={dems}
            filtre={onglet}
            recherche={recherche}
            onRecherche={setRecherche}
            onOuvrirClient={ouvrirClient}
            onNouveauClient={ouvrirNouveauClient}
          />
        )}
      </main>

      {/* Panneau latéral de la fiche client */}
      {clientOuvert && (
        <ClientPanel
          client={clientOuvert}
          dems={dems}
          onFermer={() => setClientOuvertId(null)}
          onModifierClient={(c) => setModalClient({ client: c })}
          onSupprimerClient={supprimerClient}
          onAjouterDemarche={ouvrirNouvelleDemarcheDepuisFiche}
          onModifierDemarche={(d) => setModalDemarche({ demarche: d })}
          onSupprimerDemarche={supprimerDemarche}
          onAvancerEtape={avancerEtape}
          onDefinirStatutEtape={definirStatutEtape}
          onMajChampEtape={majChampEtape}
          onDefinirAssureur={definirAssureur}
          onDefinirStatutProduit={definirStatutProduit}
          onDefinirRevoir={definirRevoir}
          onBasculerPerVersements={basculerPerVersements}
          onBasculerRemplacement={basculerRemplacement}
          onPlacerRdv={(cible) => setModalRdv({ client: clientOuvert, cible })}
          onCloser={closerClient}
          onNoShow={marquerNoShow}
          onARappeler={marquerARappeler}
          onARelancer={(c) => setModalRelance({ client: c })}
          onPerdu={marquerPerdu}
          onBasculerDocs={basculerDocs}
          onBasculerAudit={basculerAudit}
          onReactiver={reactiverClient}
        />
      )}

      {/* Modale client */}
      {modalClient && (
        <ClientModal
          client={modalClient.client}
          onEnregistrer={enregistrerClient}
          onFermer={() => setModalClient(null)}
        />
      )}

      {/* Modale démarche */}
      {modalDemarche && (
        <DemarcheModal
          demarche={modalDemarche.demarche}
          clients={clients}
          clientIdParDefaut={modalDemarche.clientIdParDefaut}
          produitParDefaut={modalDemarche.produitParDefaut}
          onEnregistrer={enregistrerDemarche}
          onFermer={() => setModalDemarche(null)}
        />
      )}

      {/* Modale "placer un R2 / R3" */}
      {modalRdv && (
        <PlacerRdvModal
          cible={modalRdv.cible}
          client={modalRdv.client}
          onConfirmer={confirmerPlacerRdv}
          onFermer={() => setModalRdv(null)}
        />
      )}

      {/* Modale "à relancer le…" */}
      {modalRelance && (
        <RelanceModal
          client={modalRelance.client}
          onConfirmer={confirmerRelance}
          onFermer={() => setModalRelance(null)}
        />
      )}
    </div>
  )
}
