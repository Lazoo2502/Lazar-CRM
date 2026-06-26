import { createClient } from '@supabase/supabase-js'

// Connexion à Supabase (base de données + authentification en ligne).
// Les identifiants viennent du fichier .env (URL du projet + clé publishable).
const url = import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(url, cle)
