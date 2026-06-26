import { creneauxHeure, formatHeure } from '../dateUtils.js'

// Sélecteur d'heure réutilisable : un menu déroulant par tranches de 15 min.
export default function ChampHeure({ value, onChange, className }) {
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {creneauxHeure().map((h) => (
        <option key={h} value={h}>
          {formatHeure(h)}
        </option>
      ))}
    </select>
  )
}
