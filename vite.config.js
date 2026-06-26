import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Emplacement du fichier de données, à la racine du dossier du projet.
const FICHIER_DONNEES = path.resolve(process.cwd(), 'donnees.json')

// Petit "relais" qui ajoute deux points d'accès au serveur de développement :
//   GET  /api/data  → renvoie le contenu de donnees.json
//   POST /api/data  → écrit le contenu reçu dans donnees.json
// C'est ce qui permet à l'application de lire/écrire un vrai fichier sur le disque.
function stockageFichier() {
  return {
    name: 'stockage-fichier',
    configureServer(server) {
      server.middlewares.use('/api/data', (req, res) => {
        if (req.method === 'GET') {
          try {
            const contenu = fs.readFileSync(FICHIER_DONNEES, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(contenu)
          } catch {
            // Le fichier n'existe pas encore (premier lancement).
            res.statusCode = 204
            res.end()
          }
          return
        }

        if (req.method === 'POST') {
          let corps = ''
          req.on('data', (morceau) => (corps += morceau))
          req.on('end', () => {
            try {
              fs.writeFileSync(FICHIER_DONNEES, corps)
              res.statusCode = 200
              res.end('{"ok":true}')
            } catch (e) {
              res.statusCode = 500
              res.end('{"ok":false}')
            }
          })
          return
        }

        res.statusCode = 405
        res.end()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), stockageFichier()],
  server: {
    port: 5173,
    open: true,
  },
})
