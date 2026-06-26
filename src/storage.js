// Stockage des données dans Supabase (base de données en ligne).
// Chaque client / démarche est une ligne { id, user_id, data } où "data" contient
// l'objet complet (en JSON). L'utilisateur ne voit que ses propres lignes (sécurité RLS).

import { supabase } from './supabase.js'

// Valeurs par défaut, pour garantir que les champs récents existent toujours.
function normaliser(c) {
  return {
    docsRecus: false,
    auditFait: false,
    aReprogrammer: false,
    aRappeler: false,
    relanceLe: '',
    relanceMotif: '',
    etapes: [],
    perVersements: true,
    remplacementParProduit: {},
    assureurParProduit: {},
    statutProduit: {},
    revoirParProduit: {},
    prochainRdvHeure: '',
    prochainRdvDuree: 60,
    mailCrEnvoye: true,
    ...c,
  }
}

// Mémoire du dernier état sauvegardé (pour n'écrire que ce qui a changé).
let snapClients = new Map()
let snapDems = new Map()

// Charge clients + démarches depuis Supabase.
export async function chargerDonnees() {
  const [rc, rd] = await Promise.all([
    supabase.from('clients').select('id,data'),
    supabase.from('demarches').select('id,data'),
  ])
  if (rc.error) throw rc.error
  if (rd.error) throw rd.error

  const clients = (rc.data || []).map((r) => normaliser(r.data))
  const dems = (rd.data || []).map((r) => r.data)

  snapClients = new Map(clients.map((c) => [c.id, JSON.stringify(c)]))
  snapDems = new Map(dems.map((d) => [d.id, JSON.stringify(d)]))
  return { clients, dems }
}

// Synchronise une table : n'écrit que les lignes modifiées, supprime celles enlevées.
async function syncTable(table, liste, snap) {
  const idsActuels = new Set(liste.map((x) => x.id))

  const aUpserter = []
  for (const x of liste) {
    const j = JSON.stringify(x)
    if (snap.get(x.id) !== j) {
      aUpserter.push({ id: x.id, data: x, updated_at: new Date().toISOString() })
    }
  }
  if (aUpserter.length) {
    const { error } = await supabase.from(table).upsert(aUpserter)
    if (error) throw error
  }

  const aSupprimer = [...snap.keys()].filter((id) => !idsActuels.has(id))
  if (aSupprimer.length) {
    const { error } = await supabase.from(table).delete().in('id', aSupprimer)
    if (error) throw error
  }

  snap.clear()
  liste.forEach((x) => snap.set(x.id, JSON.stringify(x)))
}

// Sauvegarde (uniquement les changements) + miroir localStorage (filet de sécurité).
export async function sauvegarder(clients, dems) {
  try {
    localStorage.setItem('clients', JSON.stringify(clients))
    localStorage.setItem('dems', JSON.stringify(dems))
  } catch {
    // ignore
  }
  await syncTable('clients', clients, snapClients)
  await syncTable('demarches', dems, snapDems)
}

// --- Migration : lire les données locales d'avant (fichier donnees.json, sinon navigateur) ---
export async function lireLocal() {
  try {
    const r = await fetch('/api/data')
    if (r.ok && r.status !== 204) {
      const d = await r.json()
      if (d && Array.isArray(d.clients)) {
        return { clients: d.clients, dems: d.dems || [] }
      }
    }
  } catch {
    // pas de serveur local : on tente le navigateur
  }
  const c = localStorage.getItem('clients')
  const d = localStorage.getItem('dems')
  return {
    clients: c ? JSON.parse(c) : [],
    dems: d ? JSON.parse(d) : [],
  }
}

// Importe les données locales dans Supabase (une seule fois).
export async function importerDepuisLocal() {
  const { clients, dems } = await lireLocal()
  if (clients.length) {
    const { error } = await supabase
      .from('clients')
      .upsert(clients.map((c) => ({ id: c.id, data: c })))
    if (error) throw error
  }
  if (dems.length) {
    const { error } = await supabase
      .from('demarches')
      .upsert(dems.map((d) => ({ id: d.id, data: d })))
    if (error) throw error
  }
  return { clients: clients.length, dems: dems.length }
}
