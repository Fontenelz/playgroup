// Roda `prisma migrate deploy` só no deploy de produção da Vercel.
// Previews (um por PR/branch) e builds locais/CI pulam a migration: se as env
// vars de preview apontarem para o banco de produção, uma branch experimental
// não pode alterar o schema de produção. Falha na migration derruba o deploy.
import { execSync } from 'node:child_process'

const env = process.env.VERCEL_ENV

if (env !== 'production') {
  console.log(`[vercel-migrate] VERCEL_ENV=${env ?? '(indefinido)'} — migrations puladas`)
  process.exit(0)
}

console.log('[vercel-migrate] VERCEL_ENV=production — aplicando migrations')
execSync('prisma migrate deploy', { stdio: 'inherit' })
