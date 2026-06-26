// Données d'exemple chargées UNIQUEMENT au tout premier lancement
// (quand le localStorage est encore vide), pour que l'application ne soit pas vide.
//
// Le scénario illustre les différents états du tunnel :
//  - un prospect en R2 avec documents à relancer,
//  - un prospect en R3 (docs déjà reçus),
//  - un prospect dont le R1 est passé (à faire avancer),
//  - un client closé avec ses démarches administratives en cours.

// Renvoie une date au format AAAA-MM-JJ, décalée de "nbJours" par rapport à aujourd'hui.
function jour(nbJours) {
  const d = new Date()
  d.setDate(d.getDate() + nbJours)
  return d.toISOString().slice(0, 10)
}

export function donneesExemple() {
  const clients = [
    {
      id: 'c1',
      nom: 'Sophie Bernard',
      telephone: '06 12 34 56 78',
      email: 'sophie.bernard@email.fr',
      phase: 'R2',
      docsRecus: false, // → relance "documents non reçus, envoyer un mail" (RDV demain)
      auditFait: false,
      produits: ['PER', 'AV'],
      prochainRdv: jour(1),
      notes: 'Souhaite transférer son ancien PER bancaire. Profil prudent.',
    },
    {
      id: 'c2',
      nom: 'Julien Moreau',
      telephone: '07 55 44 33 22',
      email: 'julien.moreau@email.fr',
      phase: 'R3',
      docsRecus: true, // docs reçus mais audit pas encore fait → relance "faire l'audit"
      auditFait: false,
      produits: ['AV'],
      prochainRdv: jour(2),
      notes: 'R3 de closing. Présenter l\'arbitrage proposé.',
    },
    {
      id: 'c3',
      nom: 'Claire Lefèvre',
      telephone: '07 11 22 33 44',
      email: 'claire.lefevre@email.fr',
      phase: 'R1',
      docsRecus: false,
      auditFait: false,
      produits: [],
      prochainRdv: jour(-2), // R1 passé → rappel "placer un R2 ou R1 KO"
      notes: 'Recommandée par M. Dubois.',
    },
    {
      id: 'c4',
      nom: 'Marc Dubois',
      telephone: '06 98 76 54 32',
      email: 'marc.dubois@email.fr',
      phase: 'Closé', // client → suivi des étapes par produit
      docsRecus: true,
      auditFait: true,
      produits: ['Prévoyance', 'Mutuelle'],
      prochainRdv: '',
      perVersements: true,
      // Prévoyance en remplacement d'un ancien contrat → résiliation à suivre.
      remplacementParProduit: { Prévoyance: true },
      etapes: [
        { produit: 'Prévoyance', type: 'Signature du contrat', statut: 'fait', dateEnvoiClient: '' },
        // Lettre envoyée au client il y a 12 jours, pas encore renvoyée → relance auto.
        {
          produit: 'Prévoyance',
          type: 'Lettre résiliation',
          statut: 'envoyée client',
          dateEnvoiClient: jour(-12),
        },
      ],
      notes: 'TNS. Contrats signés, mise en place en cours.',
    },
  ]

  const dems = [
    {
      id: 'd1',
      clientId: 'c4',
      type: 'Souscription',
      produit: 'Prévoyance',
      statut: 'Envoyé au client',
      action: 'Relancer pour signature du bulletin de souscription',
      date: jour(-3), // en retard
      notes: '',
    },
    {
      id: 'd2',
      clientId: 'c4',
      type: 'Lettre résiliation',
      produit: 'Mutuelle',
      statut: 'À faire',
      action: 'Préparer la lettre de résiliation de l\'ancienne mutuelle',
      date: jour(4), // cette semaine
      notes: '',
    },
  ]

  return { clients, dems }
}
