// Sélecteur de durée d'un RDV : seulement 15, 30, 45 min ou 1h.
const DUREES = [15, 30, 45, 60]

export function libelleDuree(m) {
  return m === 60 ? '1h' : `${m} min`
}

export default function ChampDuree({ value, onChange, className }) {
  return (
    <select
      className={className}
      value={value || 60}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {DUREES.map((d) => (
        <option key={d} value={d}>
          {libelleDuree(d)}
        </option>
      ))}
    </select>
  )
}
