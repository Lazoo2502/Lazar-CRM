import { useState } from 'react'
import { X } from 'lucide-react'
import { TYPES_DEMARCHE, STATUTS_DEMARCHE, PRODUITS } from '../constants.js'
import { aujourdhui } from '../dateUtils.js'

// Modale d'ajout / modification d'une démarche.
// - "demarche" fourni => modification.
// - "clientIdParDefaut" => pré-remplit le client (quand on ajoute depuis sa fiche).
export default function DemarcheModal({
  demarche,
  clients,
  clientIdParDefaut,
  produitParDefaut,
  onEnregistrer,
  onFermer,
}) {
  const [form, setForm] = useState(
    demarche || {
      clientId: clientIdParDefaut || (clients[0] && clients[0].id) || '',
      type: TYPES_DEMARCHE[0],
      produit: produitParDefaut || PRODUITS[0],
      statut: 'À faire',
      action: '',
      date: aujourdhui(),
      notes: '',
    },
  )

  function maj(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }))
  }

  function valider(e) {
    e.preventDefault()
    if (!form.clientId) {
      alert('Il faut associer la démarche à un client.')
      return
    }
    onEnregistrer(form)
  }

  return (
    <div className="modal-fond" onClick={onFermer}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-entete">
          <h2>{demarche ? 'Modifier la démarche' : 'Nouvelle démarche'}</h2>
          <button className="btn-icone" onClick={onFermer} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={valider} className="formulaire">
          <label>
            Client
            <select
              value={form.clientId}
              onChange={(e) => maj('clientId', e.target.value)}
              disabled={!!clientIdParDefaut && !demarche}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </label>

          <div className="ligne-deux">
            <label>
              Type de démarche
              <select value={form.type} onChange={(e) => maj('type', e.target.value)}>
                {TYPES_DEMARCHE.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Produit
              <select value={form.produit} onChange={(e) => maj('produit', e.target.value)}>
                {PRODUITS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="ligne-deux">
            <label>
              Statut
              <select value={form.statut} onChange={(e) => maj('statut', e.target.value)}>
                {STATUTS_DEMARCHE.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Date de relance
              <input
                type="date"
                value={form.date}
                onChange={(e) => maj('date', e.target.value)}
              />
            </label>
          </div>

          <label>
            Prochaine action
            <input
              type="text"
              value={form.action}
              onChange={(e) => maj('action', e.target.value)}
              placeholder="Ex : Relancer pour signature du bulletin"
            />
          </label>

          <label>
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => maj('notes', e.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-gris" onClick={onFermer}>
              Annuler
            </button>
            <button type="submit" className="btn btn-principal">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
