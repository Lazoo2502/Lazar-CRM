// Petites fonctions utilitaires pour gérer les dates (au format texte AAAA-MM-JJ).

// Formate une date en AAAA-MM-JJ à partir de ses composantes LOCALES
// (et non en UTC, pour éviter tout décalage d'un jour selon le fuseau horaire).
function isoLocal(d) {
  const an = d.getFullYear()
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const jour = String(d.getDate()).padStart(2, '0')
  return `${an}-${mois}-${jour}`
}

// La date d'aujourd'hui au format AAAA-MM-JJ.
export function aujourdhui() {
  return isoLocal(new Date())
}

// Affiche une heure "HH:MM" en format français : "9h00". Vide si pas d'heure.
export function formatHeure(h) {
  if (!h) return ''
  const [hh, mm] = h.split(':')
  return `${parseInt(hh, 10)}h${mm}`
}

// Convertit une heure "HH:MM" en minutes depuis minuit (0 si vide).
export function minutesHeure(h) {
  if (!h) return 0
  const [hh, mm] = h.split(':')
  return parseInt(hh, 10) * 60 + parseInt(mm, 10)
}

// L'heure actuelle, en minutes depuis minuit (heure locale).
export function maintenantMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

// Créneaux horaires proposés (07h00 → 20h45, par tranches de 15 min).
export function creneauxHeure() {
  const list = []
  for (let h = 7; h <= 20; h++) {
    for (const m of ['00', '15', '30', '45']) {
      list.push(`${String(h).padStart(2, '0')}:${m}`)
    }
  }
  return list
}

// Affiche une date AAAA-MM-JJ en format français lisible : "lun. 18 juin".
export function formatDateFr(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// Décale une date AAAA-MM-JJ de "n" jours (n peut être négatif). Renvoie une date AAAA-MM-JJ.
export function decalerDate(dateStr, n) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return isoLocal(d)
}

// Nombre de jours entre aujourd'hui et la date donnée (négatif = passé).
export function joursRestants(dateStr) {
  if (!dateStr) return null
  const a = new Date(aujourdhui() + 'T00:00:00')
  const b = new Date(dateStr + 'T00:00:00')
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

// Catégorie d'urgence d'une date de relance.
// Renvoie : 'retard' | 'aujourdhui' | 'semaine' | 'plustard'
export function urgence(dateStr) {
  const j = joursRestants(dateStr)
  if (j === null) return 'plustard'
  if (j < 0) return 'retard'
  if (j === 0) return 'aujourdhui'
  if (j <= 7) return 'semaine'
  return 'plustard'
}

// Libellés affichés pour chaque catégorie d'urgence.
export const LIBELLE_URGENCE = {
  retard: 'En retard',
  aujourdhui: 'Aujourd\'hui',
  semaine: 'Cette semaine',
  plustard: 'Plus tard',
}
