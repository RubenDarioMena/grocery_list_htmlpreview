import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function apiPlugin() {
  let handler
  return {
    name: 'api-middleware',
    async configureServer(server) {
      handler = (await server.ssrLoadModule('/api/generate-list.js')).default

      server.middlewares.use('/api/generate-list', async (nodeReq, nodeRes) => {
        nodeRes.status = (code) => { nodeRes.statusCode = code; return nodeRes }
        nodeRes.json = (data) => {
          nodeRes.setHeader('Content-Type', 'application/json')
          nodeRes.end(JSON.stringify(data))
        }

        if (nodeReq.method === 'OPTIONS') {
          nodeRes.setHeader('Access-Control-Allow-Origin', '*')
          nodeRes.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          nodeRes.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          nodeRes.statusCode = 200
          nodeRes.end()
          return
        }

        const chunks = []
        nodeReq.on('data', chunk => chunks.push(chunk))
        nodeReq.on('end', async () => {
          try {
            nodeReq.body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
          } catch {
            nodeReq.body = {}
          }
          await handler(nodeReq, nodeRes)
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
})
