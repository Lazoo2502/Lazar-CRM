// Export Excel via la librairie xlsx (SheetJS).
// Génère un fichier .xlsx contenant 2 onglets : "Clients" et "Démarches".

import * as XLSX from 'xlsx'
import { formatDateFr } from './dateUtils.js'
import { infoStatut } from './pipeline.js'

export function exporterExcel(clients, dems) {
  // Onglet "Clients" : on transforme chaque client en ligne lisible.
  const lignesClients = clients.map((c) => ({
    Nom: c.nom,
    Téléphone: c.telephone,
    Email: c.email,
    Phase: c.phase,
    Statut: infoStatut(c.phase).libelle,
    'Documents reçus': c.docsRecus ? 'Oui' : 'Non',
    Produits: (c.produits || []).join(', '),
    'Prochain RDV': formatDateFr(c.prochainRdv),
    Notes: c.notes,
  }))

  // Onglet "Démarches" : on ajoute le nom du client en clair (pas juste son id).
  const nomParId = {}
  clients.forEach((c) => {
    nomParId[c.id] = c.nom
  })

  const lignesDems = dems.map((d) => ({
    Client: nomParId[d.clientId] || '(client supprimé)',
    Type: d.type,
    Produit: d.produit,
    Statut: d.statut,
    Action: d.action,
    'Date de relance': formatDateFr(d.date),
    Notes: d.notes,
  }))

  // Création du classeur avec les 2 feuilles.
  const classeur = XLSX.utils.book_new()
  const feuilleClients = XLSX.utils.json_to_sheet(lignesClients)
  const feuilleDems = XLSX.utils.json_to_sheet(lignesDems)

  XLSX.utils.book_append_sheet(classeur, feuilleClients, 'Clients')
  XLSX.utils.book_append_sheet(classeur, feuilleDems, 'Démarches')

  // Nom du fichier avec la date du jour.
  const dateFichier = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(classeur, `CRM-export-${dateFichier}.xlsx`)
}
