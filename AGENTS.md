# AGENTS.md — PlayGroup Monorepo

Guia técnico para agentes de IA (e humanos) trabalhando neste repositório. PlayGroup é um app brasileiro para organizar peladas/grupos esportivos: grupos, eventos recorrentes, confirmação de presença, cobrança (mensalistas/avulsos), sorteio de times e ranking de presença.

## 1. Visão geral do monorepo

- **Gerenciador**: pnpm workspaces (`pnpm@10.15.1`) + **Turborepo** (`turbo.json`). Workspaces apenas em `apps/*` — **não existe `packages/*`**, portanto não há pacote de tipos compartilhado entre API e Web.
- **Apps**:
  - `apps/api` — NestJS 11 + Prisma 6 (porta padrão `3333`)
  - `apps/web` — Next.js 16 (App Router) + React 19 (porta padrão `3000`)
- **Banco de dados de dados da aplicação**: Postgres local via `docker-compose.yml` (serviço `postgres`, porta host **5433**), gerenciado pelo Prisma. Não confundir com o diretório `supabase/`.
- **Supabase**: usado **apenas para Auth** (JWT, OAuth, sessões anônimas). O schema SQL em `supabase/migrations/001_initial_schema.sql` é **legado/histórico** — representa a arquitetura antiga baseada em RLS + funções `SECURITY DEFINER` no Postgres, que foi abandonada em favor da reescrita em NestJS/Prisma (autorização agora vive em código, em `AuthzService`).
- **Lint/format**: Biome (`biome.json`, raiz) cobre apenas `apps/api/**`. `apps/web` usa ESLint flat config (`eslint-config-next`).
- **Sem CI** (não há `.github/workflows`), **sem Dockerfiles de app** (só Postgres containerizado), **sem testes** em nenhum dos dois apps (zero `*.spec.ts`, Jest não instalado na API; Playwright está como devDependency no web mas sem specs).
- **Sem `.nvmrc`/`engines`** — versão de Node não é fixada.
- **`README.md` da raiz está desatualizado** (ainda é o boilerplate padrão do `create-next-app`, não reflete o monorepo).

### Scripts da raiz
```
pnpm dev        # turbo run dev (ambos apps em paralelo, watch mode)
pnpm build      # turbo run build
pnpm lint       # biome check .
pnpm format     # biome format --write .
pnpm db:up      # sobe o Postgres local (docker compose)
pnpm db:down    # derruba o Postgres local
pnpm db:studio  # prisma studio (via workspace api)
pnpm db:seed    # roda apps/api/prisma/seed.ts
```

## 2. apps/api (NestJS)

Stack: `@nestjs/* ^11`, `@prisma/client ^6`, `class-validator`/`class-transformer`, `jose` (verificação JWT/JWKS), `ConfigModule` global.

### Estrutura de módulos (`apps/api/src`)
```
app.module.ts
auth/            SupabaseJwtGuard, SupabaseOptionalAuthGuard, SupabaseJwtService (@Global)
common/          AuthzService (autorização em código), @CurrentUser(), SPORT_LABELS
dashboard/  events/  groups/  guest-events/  invites/  notifications/  prisma/  users/
main.ts
```
Não há pasta `dto/` dedicada — DTOs com `class-validator` ficam inline no topo de cada controller. Não há interceptors/pipes/exception filters customizados além das exceptions built-in do Nest.

### Autenticação
- `SupabaseJwtService` verifica o token via JWKS remoto (`jose.createRemoteJWKSet`), issuer `${SUPABASE_URL}/auth/v1`, audience `authenticated`. Extrai `SupabaseUser { id, email, avatarUrl }` do payload.
- `SupabaseJwtGuard` — exige `Authorization: Bearer <token>`, lança `UnauthorizedException` se ausente/inválido.
- `SupabaseOptionalAuthGuard` — mesma extração, mas segue sem usuário (`req.user` undefined) se não houver token válido; usado no preview de eventos-convidado para visitantes anônimos.
- `AuthModule` é `@Global()` — qualquer módulo pode usar os guards sem reimportar.

### Autorização (`common/authz.service.ts`)
Reimplementação em código do que antes era RLS no Postgres (o Postgres de dados atual não tem RLS nem conhece o usuário autenticado):
- `assertGroupMember` — membro ativo do grupo.
- `assertGroupOrganizer` — role `admin` ou `organizer`.
- `assertGroupAdmin` — `Group.adminId === userId`.
- `assertEventManager` — eventos de grupo: organizadores do grupo; **eventos standalone (sem grupo): apenas o criador**.

### Prisma
- `schema.prisma` gera client em `../generated/prisma` (fora do padrão, `apps/api/generated/prisma`, gitignored).
- `DATABASE_URL` é a única env var de datasource.
- `PrismaService` (extends `PrismaClient`, `OnModuleInit/OnModuleDestroy`) exportado globalmente por `PrismaModule`.
- Migrations relevantes: `init` → `add_user_email` → `standalone_events` (adiciona `EventVisibility` enum `link_only|public`, torna `events.group_id` nullable, CHECK constraint garantindo evento é OU de grupo OU standalone).
- `prisma/seed.ts` popula 6 usuários (1 guest), 2 grupos, convites, 5 eventos, pagamentos e notificações — útil para testar localmente.

### Modelos principais (Prisma)
`User`, `Group`, `GroupMember`, `InviteCode`, `Event` (nullable `groupId` + `visibility` para standalone), `EventParticipant`, `Waitlist` (seedado mas **sem controller/rota expondo**), `Payment` (idem, **sem módulo de pagamentos ainda**), `Notification`.

**Convenção de resposta**: os serviços mapeiam manualmente os campos para **snake_case** no JSON de saída (`starts_at`, `max_participants`, `is_owner`, etc.), mesmo com Prisma/TS internamente em camelCase — herança da época em que o frontend consumia respostas diretas do Supabase/SQL. Não há interceptor global fazendo essa conversão; é manual em cada service.

### Rotas expostas (resumo)
- **Users** (`/users/me`, guarded): `GET /`, `GET /summary`, `PUT /` (upsert onboarding), `PATCH /`.
- **Groups** (guarded): `GET /groups`, `POST /groups`, `GET /groups/:groupId` (detalhe + ranking + membros), `GET /groups/:groupId/basic`, `POST /groups/:groupId/invite-codes`.
- **Invites**: `GET /invites/:code` (preview sem exigir membership), `POST /invites/:code/redeem` (transação atômica).
- **Events** (guarded): `POST /groups/:groupId/events`, `POST /events` (standalone), `GET /events/discover` (feed público paginado — **precisa vir antes de `:eventId`** na ordem de rotas), `GET /events/:eventId`, `POST /events/:eventId/participation/{confirm,decline}`, `POST /events/:eventId/participants/:userId/{approve,reject}` (só para eventos standalone públicos), `GET /events/:eventId/finance`, `GET /events/:eventId/draw` (sorteio de times).
- **Guest events** (`/guest-events`, guard misto por rota): `GET /:eventId` (`SupabaseOptionalAuthGuard`, retorna `status_code`: `ok|not_found|private|closed|auth_required`), `POST /:eventId/confirm` (`SupabaseJwtGuard`, aceita sessão anônima do Supabase; cria usuário guest mínimo se necessário; **retorna sempre um objeto JSON** `{ status }`, nunca string crua).
- **Notifications** / **Dashboard** (`GET /home`, `GET /ranking`): guarded, agregam dados de múltiplos módulos.

`participant_count` em `Event` é mantido manualmente em `EventsService.syncParticipantCount`, reimplementando o antigo trigger Postgres `trg_update_participant_count`.

### Variáveis de ambiente (API)
| Variável | Obrigatória | Uso |
|---|---|---|
| `DATABASE_URL` | sim | Prisma datasource |
| `SUPABASE_URL` | sim | issuer JWT (`${SUPABASE_URL}/auth/v1`) |
| `SUPABASE_JWKS_URL` | sim | verificação JWKS |
| `WEB_ORIGIN` | não (default `http://localhost:3000`) | CORS, lista separada por vírgula |
| `PORT` | não (default `3333`) | porta do servidor |

Não existe `.env.example` no repo — variáveis precisam ser inferidas/documentadas manualmente ao configurar um ambiente novo.

## 3. apps/web (Next.js)

Stack: **Next.js 16.2.9** (App Router), **React 19.2.4**, `@supabase/ssr`, `zustand`, `zod`, **Tailwind v4** (CSS-first, sem `tailwind.config.js`), `framer-motion`, Radix UI (primitivas sob um design system próprio em `components/ui/*`).

`pnpm dev` roda `next dev -p 3000 --webpack` — **força Webpack**, não usa o Turbopack que é default no Next 16.

### Roteamento (App Router)
Route groups:
- `(app)` — shell autenticado com bottom nav (Home, Grupos, Criar, Ranking, Perfil).
- `(auth)` — login/onboarding, sem shell.
- `(standalone)` — páginas públicas/guest-facing (`/e/[eventId]`, `/join/[code]`), sem shell.

Padrão consistente: `page.tsx` (Server Component, data-fetch/redirects) + `_client.tsx` colocado (interatividade) + `loading.tsx` (fallback Suspense).

Rotas de destaque: `groups/[groupId]/events/[eventId]/sortear` (sorteio de times), `eventos/descobrir` (feed público), `e/[eventId]` (RSVP de convidado), `join/[code]` (entrar por convite).

### Middleware → `proxy.ts`
**Next.js 16 renomeou `middleware.ts` para `proxy.ts`** — este repo já usa a nova convenção (`apps/web/proxy.ts`). Lógica: caminhos públicos `/login` e prefixo `/e/`; cria client Supabase SSR ligado aos cookies da request/response e chama `getUser()` logo em seguida (não colocar lógica entre criar o client e chamar `getUser()`); sem usuário e caminho não-público → redirect para `/login?next=`; usuário logado em `/login` → redirect para `/`.

### Auth flow
- OAuth/email: `lib/actions/auth.ts` (Server Actions) → `app/api/auth/callback/route.ts` troca `code` por sessão e verifica completude do perfil (`GET /users/me`, sem `city` = não onboardado) para redirecionar a `/onboarding?next=`.
- `SessionProvider` (client, envolve o app inteiro) sincroniza sessão Supabase → `useAuthStore` (Zustand), chamando `GET /users/me` **diretamente via fetch** (não usa `lib/api/client.ts`), escuta `onAuthStateChange`.
- **Fluxo guest/anônimo**: `confirmAsGuest` chama `supabase.auth.signInAnonymously()` no client antes de bater na API, dando ao visitante anônimo um JWT válido (`sub`) para passar pelo `SupabaseJwtGuard` como "guest autenticado".

### `lib/`
- `lib/api/client.ts` — wrapper fetch (`api.get/post/put/patch/delete`), injeta Bearer token via `lib/supabase/server.ts`, `cache: 'no-store'`, lança `ApiError` customizado.
- `lib/supabase/{client,server}.ts` — clients browser/server (`@supabase/ssr`).
- `lib/actions/*.ts` — Server Actions (`'use server'`) que chamam a API NestJS: `auth.ts`, `groups.ts`, `events.ts` (inclui `getGuestEventPreview`, `confirmAsGuest`, `getPublicEventsFeed`), `profile.ts`, `notifications.ts`.
- `lib/constants.ts` — `SPORTS`, `ROLES`, status enums, `ONBOARDING_STEPS`.
- `lib/utils.ts` — `cn()`, formatação pt-BR (data/moeda), `getInitials`, `getAvatarColor`, `copyToClipboard`.

### Estado
Único store Zustand: `store/auth.store.ts` — `{ user, isLoading, isAuthenticated, onboardingComplete, ... }`. **Atenção**: `isAuthenticated` e `onboardingComplete` são apenas derivados de `!!user` (comentário no código admite ser "compatibilidade com páginas existentes" — `onboardingComplete` não é de fato rastreado à parte).

### Tipos
`types/app.types.ts` — tipos TS escritos à mão espelhando o schema Prisma em snake_case (não gerados automaticamente). Existe também `data/mock/index.ts`, dado mock residual de antes da integração real com a API — provavelmente não usado mais.

### Tema
Dark-mode only (`color-scheme: dark` forçado em `:root`). Tokens via Tailwind v4 `@theme inline` em `globals.css`: `--color-primary-{50..900}` (verde), `--color-accent-{400,500}` (laranja), `--color-surface-{1..4}`.

### Variáveis de ambiente (Web)
| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client Supabase (browser e server) |
| `NEXT_PUBLIC_API_URL` | usada **só** em `SessionProvider.tsx` (fetch client-side) |
| `API_URL` | usada em `lib/api/client.ts` (Server Actions), default `http://localhost:3333` |

⚠️ `NEXT_PUBLIC_API_URL` e `API_URL` são **duas variáveis distintas apontando para o mesmo lugar** — precisam ser mantidas em sincronia manualmente ao trocar o endereço da API.

## 4. Diretório `supabase/`

- `config.toml` — config do CLI Supabase para rodar Auth/Storage/Realtime localmente (portas 54321-54322). Não é o Postgres de dados da app (esse é o do `docker-compose.yml`, porta 5433).
- `migrations/001_initial_schema.sql` — **schema legado**, único migration existente. Documenta a arquitetura original com RLS + funções `SECURITY DEFINER` (`is_group_member`, `get_invite_preview`, `redeem_invite`, `get_guest_event_preview`, `confirm_event_guest`). Serve como referência histórica das regras de negócio, já que a lógica de autorização foi portada para `AuthzService` em TypeScript. Divergências conhecidas: a versão SQL de `get_guest_event_preview` não tem o status `auth_required` nem o conceito de evento standalone — isso foi adicionado só na versão TS, depois que eventos standalone foram introduzidos.

## 5. Deploy (Render)

Configurado via Blueprint em `render.yaml` (raiz) — cobre os 3 recursos de produção:

- **`playgroup-db`** — Postgres gerenciado pelo Render (plano `free`), substitui o Postgres local do `docker-compose.yml` em produção.
- **`playgroup-api`** — serviço web (NestJS). Build: `pnpm install` → `prisma generate` → `nest build`. `preDeployCommand` roda `prisma migrate deploy` antes de cada release. Health check em `GET /health` (endpoint público adicionado em `app.controller.ts` especificamente para isso — a API não tinha nenhuma rota pública na raiz antes).
- **`playgroup-web`** — serviço web (Next.js). Build/start via `pnpm --filter web build/start`.

URLs previsíveis (nomes fixos no Blueprint): `https://playgroup-api.onrender.com` e `https://playgroup-web.onrender.com`, usadas para popular automaticamente `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL` e `API_URL`.

**Env vars que exigem preenchimento manual no dashboard do Render** (marcadas `sync: false` no Blueprint, não versionadas por serem segredos do projeto Supabase):
- API: `SUPABASE_URL`, `SUPABASE_JWKS_URL`
- Web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Plano atual: `free`** — implica duas limitações a ter em mente:
- Os serviços web "dormem" após ~15 min sem tráfego (cold start lento no primeiro request seguinte).
- O Postgres free expira em 30 dias — depois disso é preciso recriar o banco (e migrar dados) ou fazer upgrade para um plano pago.

Para atualizar o deploy: editar `render.yaml` e dar push — o Render aplica o Blueprint automaticamente em repos conectados.

## 6. Pontos de atenção para quem for mexer no código

- **Sem tipos compartilhados**: qualquer mudança de schema exige atualizar manualmente `schema.prisma`, o DTO do controller correspondente, e `apps/web/types/app.types.ts` (além de interfaces inline duplicadas em `lib/actions/*.ts`). Não existe codegen (OpenAPI/tRPC) ligando os dois apps.
- **Convenção snake_case na API**: respostas JSON da API usam snake_case por mapeamento manual em cada service — não esquecer de seguir o padrão ao adicionar campos novos.
- **Ordem de rotas no Nest**: `GET /events/discover` precisa ser declarada antes de `GET /events/:eventId` para não ser capturada pelo parâmetro dinâmico.
- **`Waitlist` e `Payment`** existem no schema Prisma e no seed, mas **não têm controller/service expondo rotas** — funcionalidade parcialmente implementada.
- **Sem testes**: qualquer mudança não tem rede de segurança automatizada; validar manualmente (rodar `pnpm dev`, exercitar o fluxo na UI/API).
- **`API_URL` vs `NEXT_PUBLIC_API_URL`** no web — manter sincronizadas.
- Todo o app é **pt-BR** (strings, mensagens de erro, formatação de data/moeda) — manter esse idioma em qualquer texto voltado ao usuário.
