# PlayGroup

App para organizar peladas e grupos esportivos: grupos, eventos recorrentes (ou avulsos), confirmação de presença, cobrança de mensalistas/avulsos, sorteio de times e ranking de presença.

Monorepo pnpm + Turborepo, dois apps:

- **`apps/web`** — Next.js 16 (App Router) + React 19 + Tailwind v4
- **`apps/api`** — NestJS 11 + Prisma 6

Auth é feito pelo Supabase; o banco de dados da aplicação é um Postgres próprio (Neon em produção, Docker local em dev) — não é o mesmo Postgres do Supabase.

Para o guia técnico completo (módulos da API, autenticação/autorização, convenções de código, rotas, deploy) ver [`AGENTS.md`](./AGENTS.md).

## Rodando localmente

Requisitos: Node 22+, `pnpm@10.15.1`, Docker (para o Postgres local).

```bash
pnpm install
pnpm db:up                              # sobe o Postgres local (docker compose, porta 5433)
cd apps/api && pnpm prisma:migrate      # aplica as migrations
cd ../.. && pnpm db:seed                # opcional: popula dados de exemplo
pnpm dev                                # sobe web (:3000) e api (:3333) em paralelo
```

Cada app precisa de variáveis de ambiente próprias — copie `apps/api/.env.example` para `apps/api/.env` e `apps/web/.env.example` para `apps/web/.env.local`, preenchendo os valores. Ver a lista comentada nas seções 2 e 3 do `AGENTS.md`.

## Estrutura

```
apps/
  web/       Next.js 16 (App Router) — UI e client-side
  api/       NestJS 11 + Prisma 6 — backend de dados
supabase/    config do Supabase CLI (Auth) + schema SQL legado (histórico)
```

## Scripts (raiz)

```bash
pnpm dev        # turbo run dev — web + api em paralelo, watch mode
pnpm build      # turbo run build
pnpm lint       # biome check . (cobre apps/api)
pnpm format     # biome format --write .
pnpm db:up      # sobe o Postgres local (docker compose)
pnpm db:down    # derruba o Postgres local
pnpm db:studio  # prisma studio
pnpm db:seed    # popula dados de exemplo
```

`apps/web` tem seu próprio lint (`pnpm --filter web lint`, ESLint/Next).

## Deploy

Produção roda na **Vercel** (web + api) com banco **Neon** (Postgres) e **Supabase** (Auth). Detalhes de configuração, variáveis de ambiente e o cuidado com pooled/direct connection do Neon estão na seção 5 do `AGENTS.md`.
