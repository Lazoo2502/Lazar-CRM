// Toutes les valeurs autorisées du modèle de données, centralisées ici.
// Ainsi, si tu veux ajouter un produit ou un type de démarche, tu le fais à un seul endroit.

// PHASES = les étapes du tunnel commercial (prospect → client).
// C'est le champ qui pilote tout l'affichage : au début c'est R1, puis R2 fait
// apparaître le suivi des documents, et « Closé » fait apparaître les démarches admin.
export const PHASES = ['R1', 'R2', 'R3', 'RDV ponctuel', 'Closé', 'Perdu']

// Phases où l'on attend des documents du client AVANT le rendez-vous
// (au moins 24h avant, avec un rappel 48h avant).
export const PHASES_AVEC_DOCS = ['R2', 'R3']

export const PRODUITS = ['PER', 'AV', 'Prévoyance', 'Mutuelle', 'Emprunteur']

// Assureurs possibles pour un produit (choisi dans le bloc produit de la fiche).
export const ASSUREURS = ['Abeille', 'Swisslife', 'Garance', 'Generali', 'BNP Cardif']

export const TYPES_DEMARCHE = [
  'Audit',
  'Souscription',
  'Signature du contrat',
  'Transfert PER',
  'Lettre arrêt versement',
  'Mise en place prélèvements',
  'Lettre résiliation',
  'Ordre de remplacement',
  'Mail à répondre',
  'Document à récupérer',
]

export const STATUTS_DEMARCHE = [
  'À faire',
  'Envoyé au client',
  'Signé reçu',
  'Envoyé à l\'assureur',
  'Envoyée',
  'En attente',
  'Confirmé / Terminé',
]

// Le statut qui fait disparaître une démarche de la to-do.
export const STATUT_TERMINE = 'Confirmé / Terminé'

// Étapes type (checklist) de mise en place, propres à chaque produit.
// "remplacementSeulement: true" = étape ajoutée uniquement si le contrat REMPLACE
// un ancien contrat (sinon, pour un nouveau contrat, on ne la propose pas).
export const ETAPES_PRODUIT = {
  PER: [
    { type: 'Fiche découverte' },
    { type: 'Souscription' },
    { type: 'Lettre arrêt versement' },
    { type: 'Transfert PER' },
    { type: 'Mise en place prélèvements' },
  ],
  AV: [{ type: 'Souscription' }, { type: 'Mise en place prélèvements' }],
  Prévoyance: [
    { type: 'Signature du contrat' },
    { type: 'Lettre résiliation', remplacementSeulement: true },
    { type: 'Ordre de remplacement', remplacementSeulement: true },
  ],
  Mutuelle: [
    { type: 'Signature du contrat' },
    { type: 'Lettre résiliation', remplacementSeulement: true },
    { type: 'Ordre de remplacement', remplacementSeulement: true },
  ],
  Emprunteur: [
    { type: 'Signature du contrat' },
    { type: 'Lettre résiliation', remplacementSeulement: true },
  ],
}
