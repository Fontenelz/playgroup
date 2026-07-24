# Plano de Ação — Evolução de Arquitetura do PlayGroup

> Documento de acompanhamento da [auditoria de arquitetura](../playgroup-auditoria.html) (commit `6afacb0`). Objetivo: transformar os achados em trilhas de trabalho executáveis, incluindo uma decisão arquitetural em aberto que foi avaliada — evolução para Clean Architecture com SOLID, na versão proporcional a um projeto mantido por uma única pessoa — e uma trilha de observabilidade que hoje é quase inexistente no projeto.
>
> **GraphQL foi avaliado e descartado por ora** (ver decisão abaixo) — o projeto é mantido por uma única pessoa, então o principal ganho do GraphQL (contrato único entre múltiplos consumidores/devs) não se paga hoje. Revisitar só se isso mudar (mais devs, ou um segundo cliente consumindo a API).

## 0. Princípios que guiam este plano

1. **Incremental, nunca big-bang.** Nenhuma trilha exige parar features novas. Cada item é uma PR revisável isoladamente.
2. **"Strangler fig" para tudo que envolve reescrita.** Código novo convive com o antigo até ficar claro que o novo caminho é melhor na prática, não só na teoria.
3. **Medir antes de otimizar.** A Trilha C (Observabilidade) vem cedo no cronograma de propósito — sem ela, não dá pra confirmar se as correções de performance/concorrência realmente resolveram o problema em produção.
4. **YAGNI aplicado à Clean Architecture.** Solo, o benefício de Clean Architecture não vem de impor fronteiras entre pessoas (não há esse problema aqui) — vem de SRP (quebrar os god-services) e testabilidade (regra de negócio sem banco). Por isso a Trilha B abaixo **não** inclui abstração via interface de repositório (o DIP "completo") — isso só se paga com múltiplos consumidores da abstração, o que não é o caso.

Três trilhas, independentes entre si, sequenciadas na seção 4:

| Trilha | Resolve |
|---|---|
| **A — Correções táticas** | Os problemas de segurança/concorrência/performance já catalogados na auditoria |
| **B — Clean Architecture-lite + SOLID (SRP/OCP)** | God services, regra de negócio espalhada (`event.groupId ? ... : ...`), baixa testabilidade |
| **C — Observabilidade** | Ausência quase total de logging estruturado, sem request tracing, sem captura de erro externa, sem métricas |

---

## 1. Trilha A — Correções táticas ✅ concluída

Herdada diretamente da auditoria. Reorganizada aqui como checklist executável — todos os itens implementados e validados (testes reais contra Postgres local, ver rodapé da seção).

### A0 — Curto prazo (≈1 semana)

- [x] **Convite com aleatoriedade forte.** `groups/groups.service.ts` — `randomInviteCode()` agora usa `crypto.randomInt`.
- [x] **Rate limiting global.** `@nestjs/throttler` registrado no `AppModule` (60 req/min default), com `@Throttle` mais agressivo em `invites` (10/min) e `guest-events` (30/min).
- [x] **Transação no fluxo de vaga/fila.** `reserveSlot`/`releaseSlot` (update condicional atômico via SQL, `participant_count < max_participants` na mesma instrução) + `$transaction` em `confirmOrJoinWaitlist`, `promoteNextWaitlistEntry` e `upsertParticipant`.
  *Validado por* `test/concurrency.ts` — 20 confirmações simultâneas num evento de 5 vagas nunca ultrapassam `maxParticipants`.
- [x] **Limpeza.** `debug.log` e `apps/web/data/mock` removidos. `playgroup-doc.html` mantido — é um documento de produto real rastreado no git, não lixo.

### A1 — Médio prazo (2–4 semanas)

- [x] **`GET /events/:eventId/finance` deixa de criar dado.** `Payment` agora é criado em `ensurePayment`, chamado no momento da confirmação (`confirmOrJoinWaitlist`/`confirmWaitlistSpot`); `financeData` só lê.
  *Validado por* `test/finance-on-confirm.ts`.
- [x] **Paginação do histórico de eventos do grupo.** `GroupsService.getDetail` agora busca próximos (limite 20) + últimos (limite 15) separadamente; ranking de presença passou a consultar `EventParticipant` direto por `groupId` (histórico completo, não mais limitado à janela paginada).
  *Validado por* `test/group-detail-pagination.ts`.
- [x] **Testes de autorização** para `mark-paid`, `update-member-role`, `remove-member` e `reject-participant` (`approve-participant` já tinha cobertura em `test/smoke.ts`). Implementado como `test/authz-e2e.ts` — NestFactory real + chamada direta aos services (não Supertest/HTTP: os guards exigem JWT do Supabase verificado via JWKS remoto, e não há projeto Supabase real configurado neste ambiente para gerar um token válido). O DI graph e o `AuthzService` são exercitados de ponta a ponta contra o Postgres real, que é o que importava validar.
- [x] **Fisher–Yates** em `apps/web/lib/draw.ts`.

### A2 — Contínuo

- [x] Helper `postAction()` extraído em `lib/actions/events.ts`, eliminando o try/catch repetido nas 7 mutations simples (confirm/decline/join/leave/confirm-waitlist/approve/reject).
- [x] `buildEventTitle`/`buildEventTimes` extraídos e compartilhados entre `EventsService.create` e `.createStandalone`.
- [x] Constantes nomeadas: `WAITLIST_RESERVATION_MS` e `BRAZIL_UTC_OFFSET` em `events.service.ts`.

**Testes novos** (rodam contra Postgres real — `pnpm db:up` primeiro): `pnpm --filter api test:concurrency`, `test:finance-on-confirm`, `test:group-pagination`, `test:authz`. Adicionados ao CI (`.github/workflows/ci.yml`) ao lado do `test:smoke` existente.

---

## 2. Trilha B — Clean Architecture-lite + SOLID (versão solo)

### 2.1 Diagnóstico: quanto de Clean Architecture/SOLID faz sentido, sendo você o único dev?

Vale a pena, mas por um motivo diferente do usual. O argumento clássico pró-Clean Architecture (impor fronteiras que **outras pessoas** não podem violar por acidente, permitir múltiplos times trabalhando sem pisar um no outro) **não se aplica** com um único dev — não existe ninguém pra "proteger o domínio de". DDD tático completo (agregados com invariantes fortes, event sourcing, bounded contexts com times dedicados) também não se paga — seria over-engineering puro pro tamanho do projeto.

O que **continua valendo, sozinho**, são dois ganhos concretos e ligados a problemas reais já identificados:

- **SRP** — `EventsService` (914 linhas) e `GroupsService` (583 linhas) misturam regra de negócio, acesso a dado e efeito colateral (notificação, pagamento) na mesma classe. Isso não é um problema de "outra pessoa vai bagunçar meu código" — é um problema de **você mesmo, daqui a 6 meses, não conseguir seguir 900 linhas com 5 responsabilidades pra fazer uma mudança seguindo o efeito colateral até o fim**.
- **Testabilidade** — hoje a nota de testabilidade é 5/10 porque quase tudo exige subir a stack inteira pra validar manualmente. Regra de negócio pura (sem Prisma) testável sem banco vira um teste que roda em milissegundos, o que importa demais pra escalar *features* (torneio, evento recorrente com regra própria, PIX de verdade) sem reabrir a mesma condicional em 8 lugares.

O que **fica de fora, precisamente por ser solo**: interface de repositório (`EventsRepository` como abstração entre a regra de negócio e o Prisma). Essa é a parte "DIP completo" do SOLID — sua função é permitir trocar a implementação (útil com múltiplos devs discordando, ou se algum dia trocasse o Prisma por outra coisa). Sozinho, e sem intenção real de trocar o Prisma, isso é puro boilerplate pago sem nunca cobrar o benefício. A versão abaixo usa **domain + application**, com o use-case chamando `PrismaService` direto — sem port/interface no meio.

### 2.2 Política de adoção: onde aplicar, onde não aplicar

**Todo código novo, a partir de agora, já nasce no formato `domain/`+`application/`.** É o jeito de aproveitar o projeto ainda ser pequeno sem pagar o custo de converter tudo de uma vez: código novo escrito direto no padrão novo custa quase zero a mais do que escrever no padrão antigo, e cada feature que nascesse no formato antigo seria dívida nova se acumulando exatamente onde a Trilha B está tentando reduzir dívida existente.

**Módulos existentes só migram sob demanda — não por padronização.** Nem todo módulo tem o problema que motiva essa camada. Auditado hoje:

| Módulo | Tamanho | Migra agora? |
|---|---|---|
| `events` | 914 linhas, 5 responsabilidades | **Sim** — piloto (seção 2.5) |
| `groups` | 583 linhas, 4 responsabilidades | **Sim** — depois do piloto validado |
| `payments`, `invites`, `notifications`, `dashboard`, `users`, `auth`, `guest-events` | 20–150 linhas, responsabilidade única já clara | **Não**, por ora |

Aplicar `domain/application/` num service de 20–30 linhas (ex.: `PaymentsService`, 23 linhas) não cria clareza — cria 3 arquivos onde bastava 1, sem nenhum dos dois ganhos que justificam a camada (SRP só importa onde há uma classe grande demais pra segurar na cabeça; testabilidade isolada só importa onde há regra de negócio complexa hoje difícil de separar do Prisma). Isso pioraria "localizar código rápido" — um critério que hoje está bem avaliado — sem trocar por nada em troca. Esses módulos migram **quando** crescerem a ponto de repetir o padrão (SRP violado, lógica de negócio difícil de testar) — não antes.

**Critério objetivo pra saber quando um módulo "existente" vira candidato:** o service ultrapassa ~150–200 linhas, ou passa a misturar 3+ responsabilidades (acesso a dado + regra de negócio + efeito colateral tipo notificação/pagamento), ou alguma mudança de regra de negócio nele começa a exigir tocar em múltiplos métodos ao mesmo tempo — os mesmos sintomas que já apareceram em `events`/`groups`.

### 2.3 Camadas propostas (por módulo)

```
apps/api/src/events/
  domain/           # regra pura, sem import de Prisma/Nest
    event-capacity.policy.ts       # hasSpace, canConfirm, nextWaitlistCandidate
    event-kind.ts                  # discriminated union: GroupEvent | StandaloneEvent
  application/       # use-cases — orquestram domain + PrismaService diretamente
    confirm-participation.use-case.ts
    join-waitlist.use-case.ts
    sweep-unpaid-confirmations.use-case.ts
  events.controller.ts   # DTOs + chama use-cases, nunca Prisma direto
  events.module.ts        # liga tudo via DI: use-cases + PrismaService + AuthzService
```

Regra prática de dependência: `controller → application → domain`. **`domain/` nunca importa nada de `@prisma/client` nem de `@nestjs/*`** — essa é a única fronteira que realmente importa manter aqui. `application/` pode (e deve) injetar `PrismaService` diretamente — sem interface, sem port, sem `infrastructure/` separado. Menos pastas, menos indireção, mesmo ganho de SRP e testabilidade.

### 2.4 Exemplo — o pedaço que hoje é o pior ofensor

Hoje (`events.service.ts:414-452`), a lógica de decidir se confirma ou entra na fila está misturada com chamadas Prisma diretas, sem transação:

```ts
// domain/event-capacity.policy.ts — pura, testável sem banco
export function decideParticipationOutcome(
  event: { participantCount: number; maxParticipants: number },
): 'confirmed' | 'waitlisted' {
  return event.participantCount < event.maxParticipants ? 'confirmed' : 'waitlisted'
}
```

```ts
// application/confirm-or-join-waitlist.use-case.ts
@Injectable()
export class ConfirmOrJoinWaitlistUseCase {
  constructor(private readonly prisma: PrismaService) {}   // sem interface no meio

  async execute(eventId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { participantCount: true, maxParticipants: true },
      })
      if (!event) throw new NotFoundException('Evento não encontrado')

      const outcome = decideParticipationOutcome(event)     // domain, função pura
      if (outcome === 'confirmed') {
        return tx.eventParticipant.upsert({ /* ... */ })
      }
      return tx.waitlist.upsert({ /* ... */ })
    })
  }
}
```

A regra de negócio (`decideParticipationOutcome`) agora é uma função pura testada com um `it.each` de casos, sem subir banco nenhum. A transação (item A0 da Trilha A) tem um único lugar natural para existir: dentro do use-case. `PrismaService` é injetado direto — a fronteira que importa (regra de negócio sem Prisma) já está garantida pelo `domain/`, não precisa de uma segunda camada de abstração pra isso.

### 2.5 Plano de migração — piloto em `EventsService`

1. **Não migrar tudo de uma vez.** Escolher o pedaço de maior risco/maior ganho primeiro: o fluxo de vaga/fila (que já precisa de transação pela Trilha A0 — aproveitar a mesma PR para introduzir a camada).
2. Extrair `domain/event-capacity.policy.ts` com as funções puras já existentes implicitamente no código (`hasSpace`, promoção de fila, sweep de pagamento vencido).
3. Extrair um use-case por operação pública do controller (`ConfirmParticipationUseCase`, `JoinWaitlistUseCase`, `LeaveWaitlistUseCase`, `ConfirmWaitlistSpotUseCase`), cada um injetando `PrismaService` direto.
4. `EventsController` passa a injetar os use-cases, não mais `EventsService`.
5. Repetir para `financeData`/`drawData`/`discoverPublic` **depois**, como uma segunda PR — esses três têm menos risco de concorrência, prioridade menor.
6. Aplicar o mesmo padrão em `GroupsService` só depois de validar o piloto em `events` (não paralelizar os dois primeiro corte).
7. Módulos fora da tabela da seção 2.2 **não entram nesse plano de migração** — só se algum deles cruzar o critério objetivo descrito ali.

### 2.6 O que fica de fora, deliberadamente

- **Interface/port de repositório (DIP completo)** — só se paga com múltiplos consumidores da abstração (mais devs, ou troca real de banco/ORM). Solo, é boilerplate sem retorno — ver 2.1.
- **CQRS / event sourcing** — sem ganho no volume de dados atual; revisitar só se surgir necessidade real de read-models separados.
- **Agregados com controle de versão/optimistic locking** — o `$transaction` do Postgres já resolve a condição de corrida identificada; um agregado formal seria abstração sem necessidade concreta hoje.
- **Camada `infrastructure/` separada** — sem port pra implementar, não há o que colocar lá; `application/` já injeta `PrismaService` diretamente.
- **Conversão de módulos já pequenos e focados** (`payments`, `invites`, `notifications`, `dashboard`, `users`, `auth`, `guest-events`) — ver critério objetivo na seção 2.2.

### 2.7 Critério de "pronto"

- [ ] `domain/*.ts` de cada módulo migrado não importa `@prisma/client` nem decorators do Nest.
- [ ] Toda função em `domain/` tem teste unitário sem tocar banco.
- [ ] Nenhum controller chama `PrismaService` diretamente (só via use-case em `application/`).
- [ ] A branch `event.groupId ? ... : ...` deixa de aparecer duplicada — vira uma decisão tomada em `domain/event-kind.ts`.

---

## 3. Trilha C — Observabilidade

### 3.1 Diagnóstico (verificado no código, não hipotético)

- `@playgroup/logger` (`packages/logger/src/index.ts`) existe e funciona, mas é usado em **exatamente dois arquivos**: `main.ts` e `common/filters/all-exceptions.filter.ts`. Nenhum service loga eventos de negócio (evento confirmado, vaga promovida, pagamento marcado).
- O formato de log hoje é texto (`[timestamp] [scope] mensagem`, com `meta` como segundo argumento do `console`) — **não é JSON estruturado**, o que dificulta indexar campos (`userId`, `errorId`, `scope`) em qualquer agregador de log.
- Não existe request-id/correlation-id para requisições bem-sucedidas — só erros 5xx ganham um `errorId` (`AllExceptionsFilter`). Uma requisição lenta ou um 4xx não tem como ser correlacionado a uma sessão específica de suporte.
- Não existe captura de erro externa (Sentry ou equivalente) — hoje um erro 5xx só existe no log efêmero de uma função serverless da Vercel, sem agregação, alerta ou histórico pesquisável.
- Não existe métrica nem tracing de nenhum tipo (sem OpenTelemetry, sem APM, sem dashboard).
- Consequência prática: os achados de performance da auditoria (sweep síncrono em toda leitura, `Promise.all` de N upserts) são **suposições fundamentadas em leitura de código**, não em dado de produção — porque não há como medir hoje.

### 3.2 Passo 1 — Logging estruturado de verdade

- [ ] **Formato JSON.** Adicionar um modo `LOG_FORMAT=json` em `packages/logger/src/index.ts` que emite uma linha JSON (`{ ts, level, scope, message, ...meta }`) por entrada, em vez do prefixo texto atual. Manter o formato texto como default em dev (mais legível no terminal), JSON em produção (mais fácil de indexar).
- [ ] **Request-id em toda requisição, não só em erro.** Um middleware/interceptor global no Nest (`RequestIdMiddleware`) gera um id (`crypto.randomUUID()`) por requisição, expõe como header de resposta (`X-Request-Id`) e injeta no contexto de log — `AllExceptionsFilter` passa a reusar esse id em vez de gerar um novo só para 5xx.
- [ ] **Adotar `createLogger` nos services que hoje não logam nada.** Prioridade: os pontos que a auditoria já identificou como sensíveis — `EventsService` (confirmação, promoção de fila, sweep de pagamento vencido), `PaymentsService.markPaid`, `InvitesService.redeem`. Um log por transição de estado relevante de negócio, não log de debug genérico.
- [ ] **Web.** Hoje `@playgroup/logger` não é usado em `apps/web` — adotar pelo menos nos Server Actions que chamam a API (log de falha de `ApiError`, hoje só devolvida como `{ error }` para a UI sem nenhum registro correlável).

### 3.3 Passo 2 — Captura de erro externa

- [ ] Adicionar Sentry (ou alternativa equivalente) nos dois apps — ambos têm integração de primeira classe com Vercel/Next.js e com NestJS.
- [ ] Marcar cada evento capturado no Sentry com o `errorId`/`requestId` gerado no passo 1 como **tag** — assim um usuário reportando "deu erro X" (o `errorId` que já aparece na resposta JSON de erro) vira uma busca direta no Sentry, não uma caça ao log efêmero da Vercel.
- [ ] Web: capturar erros de client component (hoje nenhum error boundary reporta externamente) e habilitar captura de performance básica (Web Vitals) do Next.js — dado que a Vercel já oferece isso nativamente, avaliar se o Sentry adiciona valor incremental ou se o Vercel Analytics já basta antes de pagar por duas ferramentas.

### 3.4 Passo 3 — Métricas e tracing (pragmático para o contexto serverless)

Dado que `apps/api` roda como função serverless na Vercel (não um processo long-running), scraping estilo Prometheus não se aplica bem. Caminho recomendado, do mais simples ao mais completo:

1. **Logs estruturados (passo 1) + Log Drain da Vercel** para um agregador (Axiom, Better Stack, ou Datadog) — já dá visibilidade de erro/latência por rota sem infraestrutura nova, só configuração.
2. **Tracing leve via OpenTelemetry, se/quando justificar.** Prisma tem suporte (preview) a tracing OTel; um pacote `@opentelemetry/instrumentation-http` cobre o Nest. Só vale a complexidade adicional se o time realmente for investigar latência distribuída (ex.: quanto tempo cada leitura de `sweepUnpaidConfirmations` está de fato levando em produção) — **priorizar depois** dos passos 1–2, não em paralelo.
3. **Não construir um coletor OTel próprio.** Para o tamanho do time, uma SaaS de observability (mesma ferramenta do passo 2, se ela cobrir tracing) é a escolha certa — evitar operar infraestrutura de observabilidade própria.

### 3.5 Passo 4 — Métricas de negócio (opcional, fase mais tardia)

Depois que logging/erro/tracing básico existirem, considerar métricas específicas do domínio (não genéricas de infra):

- Taxa de confirmação vs. desistência por evento.
- Latência entre "vaga liberada" e "próximo da fila confirmar" (`promoteNextWaitlistEntry` → `confirmWaitlistSpot`).
- Taxa de `overdue` gerada por `sweepUnpaidConfirmations` — sinaliza se o prazo de pagamento configurado pelos grupos está calibrado.

Isso é valioso, mas depende dos passos 1–3 existirem primeiro — não adiantar aqui sem a base.

### 3.6 Como a Trilha C valida a Trilha A

- Antes de assumir que a transação da Trilha A (A0) "resolveu" o overbooking, os logs estruturados do passo 1 devem mostrar zero ocorrência de `participantCount > maxParticipants` em produção por um período de observação.
- Antes de considerar o piloto da Trilha B (Clean Architecture-lite) concluído, comparar a cobertura de teste unitário de `domain/` antes/depois — não é uma métrica de log, mas é o mesmo princípio de "medir, não assumir".

---

## 4. Cronograma consolidado

```
Fase 0 (semana 1)
├─ A0 — convite com crypto.randomInt, rate limiting, transação de vaga/fila, limpeza
└─ C1 — logging JSON estruturado + request-id em toda requisição

Fase 1 (semanas 2–4)
├─ A1 — finance read-only, paginação de histórico de grupo, testes e2e de autorização
├─ B  — piloto Clean Architecture-lite (domain + application, sem interface de repositório) no fluxo de vaga/fila do EventsService
└─ C2 — captura de erro externa (Sentry) nos dois apps, tag com request-id

Fase 2 (mês 1–2)
├─ B  — expandir camadas para o restante de EventsService, depois GroupsService
└─ C3 — tracing leve via log drain / OTel, se justificado pelos dados da Fase 0–1

Fase 3 (contínuo, conforme demanda)
├─ A2 — limpeza contínua de duplicação (callApi helper, buildEventTitle)
└─ C4 — métricas de negócio (taxa de confirmação, latência de fila, taxa de overdue)
```

---

## 5. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Migração para Clean Architecture-lite (Trilha B) parar no meio, deixando módulos em dois estilos diferentes | Migrar **um módulo por vez**, começando pelo piloto (`events`), só avançar para `groups` depois do piloto validado — nunca abrir os dois ao mesmo tempo |
| Ceder à tentação de adicionar a interface de repositório "só por garantia" no meio da migração | Reler a seção 2.1/2.5 antes de ceder — a abstração só se paga com múltiplos consumidores, o que não muda enquanto o projeto for solo |
| Observabilidade nova gerar ruído de log sem gente olhando | Adotar em cima dos pontos que a auditoria já apontou como sensíveis (seção 3.2) em vez de logar tudo — qualidade sobre volume |
| Rate limiting (A0) quebrar fluxo de convidado legítimo (ex.: várias pessoas do mesmo IP confirmando presença via link compartilhado) | Ajustar limite por rota, não um limite global único — `guest-events/:eventId/confirm` provavelmente precisa de um limite mais generoso que `invites/:code/redeem` |

## 6. Critérios de sucesso por fase

- **Fase 0:** teste de concorrência de vaga passa; código de convite não usa mais `Math.random`; logs de produção já saem em JSON com request-id.
- **Fase 1:** `GET /finance` não cria dado; rotas sensíveis têm teste e2e de autorização; primeiro módulo (`events`, fluxo de vaga) com `domain/`/`application/` separados e testados sem banco; erros 5xx aparecem no Sentry com request-id correlável ao log.
- **Fase 2:** `EventsService` e `GroupsService` sem god-methods restantes; regra grupo/avulso centralizada em `domain/event-kind.ts`.
- **Fase 3:** dívida técnica de duplicação (seção A2 da auditoria) zerada; métricas de negócio básicas disponíveis para decisões de produto (não só de engenharia).
