# Plano de Correções — PlayGroup

> Checklist dos problemas encontrados na revisão de código de 15/10/2026 (base: commit `8da560b`). Cada item é marcado com `[x]` quando a correção entra no `main`, com o commit ao lado. Complementa o [plano de ação de arquitetura](./plano-de-acao-arquitetura.md); não substitui.
>
> Severidade: 🔴 crítico · 🟠 alto · 🟡 médio · ⚪ baixo. Itens com **⚖️ decisão** precisam de uma escolha de produto antes de começar.

## Progresso

| Fase | Feitas |
|---|---|
| 1 — Segurança e controle de acesso | 0 / 7 |
| 2 — Integridade das vagas e da fila | 0 / 6 |
| 3 — Funcionalidades que não funcionam | 0 / 13 |
| 4 — Funcionalidades ausentes | 0 / 4 |
| 5 — Qualidade de código e testes | 0 / 8 |
| 6 — Infra e documentação | 0 / 3 |
| **Total** | **0 / 41** |

## Ordem recomendada

1. Fase 1 inteira. **S5 primeiro**: protege o banco de produção durante o resto do trabalho.
2. Fase 2, terminando com **I5** para corrigir contadores que já estejam errados em produção.
3. Fase 3, começando por **F1** e **F2** (as falhas mais visíveis para quem usa o app).
4. Fases 4 a 6 conforme a prioridade do produto. **Q8** avança junto: cada correção entra com o próprio teste.

---

## Fase 1 — Segurança e controle de acesso

- [ ] **S1 · Bloquear open redirect no parâmetro `next`** 🔴
  - Problema: o callback de auth e as Server Actions de login redirecionam para qualquer URL vinda de `?next=`. Um link do PlayGroup pode levar a pessoa a um site falso logo depois do login.
  - Fazer: criar `safeNextPath(next)` em `lib/utils.ts` (só aceita caminhos que começam com `/`, recusa `//` e `/\`); aplicar no callback OAuth, em `signInWithEmail`, no `emailRedirectTo` do `signUp` e no onboarding.
  - Arquivos: `apps/web/app/api/auth/callback/route.ts`, `apps/web/lib/actions/auth.ts`, `apps/web/app/(auth)/onboarding/page.tsx`, `apps/web/lib/utils.ts`
  - Pronto quando: teste Vitest de `safeNextPath` cobre `https://`, `//`, `/\` e caminhos válidos; login com `?next=https://exemplo.com` cai em `/`.

- [ ] **S2 · Exigir permissão e evento aberto para confirmar ou recusar** 🔴
  - Problema: `declineParticipation` não verifica nada; qualquer usuário cria um registro de recusa em evento privado de outro grupo. Nenhuma rota de RSVP confere se o evento foi cancelado ou já passou.
  - Fazer: `assertEventOpenForRsvp(event)` (status `published`/`open` e `startsAt` no futuro) em confirm, decline e nas três rotas de fila; em evento de grupo, decline exige `assertGroupMember`; recusar também tira a pessoa da fila e libera a reserva se ela estava `notified`.
  - Arquivos: `apps/api/src/events/events.service.ts`, `apps/api/test/authz-e2e.ts`
  - Pronto quando: não-membro recebe 403 em decline; evento cancelado ou passado recebe 400.

- [ ] **S3 · Aprovar e rejeitar só pedidos pendentes de eventos públicos** 🟠
  - Problema: `approveParticipant` faz upsert para qualquer `userId`, mesmo de quem nunca pediu, e não confere se o evento é público.
  - Fazer: `assertManageablePublicStandalone` exige `visibility === 'public'`; aprovar/rejeitar exigem `EventParticipant` existente com status `pending` (senão 404); notificar a pessoa.
  - Arquivos: `apps/api/src/events/events.service.ts`
  - Pronto quando: aprovar `userId` sem pedido retorna 404, com teste.

- [ ] **S4 · Refazer a confirmação de convidado** 🔴 ⚖️ decisão
  - Problema: `/guest-events/:id/confirm` ignora membership, fila e cobrança; checa capacidade lendo e depois escrevendo (estoura o limite sob concorrência); rebaixa para `pending` quem já estava confirmado quando o evento lota, sem devolver a vaga ao contador.
  - Decisão: evento de grupo "por convite" aceita convidado pelo link? *Recomendação: só grupos públicos; nos demais, exigir ser membro.*
  - Fazer: usar a reserva atômica (`reserveSlot` em `$transaction`); não mexer em quem já está confirmado; aplicar a regra decidida; em evento de grupo, gerar cobrança com `ensurePayment`.
  - Arquivos: `apps/api/src/guest-events/guest-events.service.ts`, `guest-events.module.ts`, `apps/api/src/events/events.service.ts`, `apps/api/test/concurrency.ts`
  - Pronto quando: N convidados simultâneos não passam de `max_participants`; reconfirmar com evento lotado mantém a pessoa confirmada.

- [ ] **S5 · Tirar as migrations dos deploys de preview** 🔴
  - Problema: o script `build` roda `prisma migrate deploy`. Na Vercel, todo preview de PR também roda; se as variáveis de preview apontam para o Neon de produção, uma branch experimental muda o schema de produção.
  - Fazer: `build` vira `prisma generate && nest build`; migration roda só quando `VERCEL_ENV === 'production'` (script `vercel-build`) ou como passo do CI antes do deploy; previews usam branch Neon próprio.
  - Arquivos: `apps/api/package.json`, env vars de Preview no dashboard da Vercel
  - Pronto quando: um deploy de preview não grava nada em `_prisma_migrations` de produção.

- [ ] **S6 · Tratar sessão anônima no proxy** 🟠
  - Problema: quem confirma como convidado fica com sessão anônima do Supabase, e o proxy trata isso como login: `/login` redireciona para `/` e a pessoa entra no app sem perfil. `/e/[id]/sortear` é público no proxy mas a API exige login.
  - Fazer: tratar `user.is_anonymous` como não logado fora das rotas públicas e liberar `/login` para anônimos; no sorteio avulso, 401 redireciona para `/login?next=`.
  - Arquivos: `apps/web/proxy.ts`, `apps/web/app/(standalone)/e/[eventId]/sortear/page.tsx`
  - Pronto quando: depois de confirmar como convidado, `/login` abre, `/home` pede login e `/e/[id]/sortear` manda para o login.

- [ ] **S7 · Rate limit que funcione em serverless** 🟡
  - Problema: o Throttler conta em memória por instância; nas funções da Vercel o limite quase não vale, e a proteção contra força bruta de convites depende dele.
  - Fazer: storage em Redis (Upstash); `app.set('trust proxy', 1)` e tracker pelo IP real.
  - Arquivos: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`
  - Pronto quando: a 11ª tentativa de redeem no mesmo minuto retorna 429, mesmo entre instâncias.

## Fase 2 — Integridade das vagas e da fila

- [ ] **I1 · Confirmação idempotente para o mesmo usuário** 🔴
  - Problema: a checagem "já está confirmado?" acontece fora da transação; dois cliques simultâneos reservam duas vagas para uma pessoa.
  - Fazer: dentro da `$transaction`, travar a linha do participante (`SELECT … FOR UPDATE`) ou só reservar vaga quando o `UPDATE` de status realmente mudar algo; aplicar em `confirmOrJoinWaitlist` e `upsertParticipant`.
  - Arquivos: `apps/api/src/events/events.service.ts`, `apps/api/test/concurrency.ts`
  - Pronto quando: 10 confirmações simultâneas do mesmo usuário aumentam `participant_count` em 1.

- [ ] **I2 · Sweeps sem liberação dupla de vaga** 🔴
  - Problema: duas leituras simultâneas do evento expiram a mesma reserva e cada uma chama `releaseSlot`: o contador desce 2 e saem notificações repetidas.
  - Fazer: `updateMany({ where: { id, status: 'notified' } })` e só liberar quando `count === 1`; mesmo padrão na reversão por falta de pagamento; cada transição em `$transaction`.
  - Arquivos: `apps/api/src/events/events.service.ts`
  - Pronto quando: reserva vencida + 5 GETs simultâneos resultam em contador −1 e uma notificação.

- [ ] **I3 · Regra da fila depois do prazo de pagamento** 🟠 ⚖️ decisão
  - Problema: depois do prazo, quem é promovido da fila confirma, já nasce "atrasado" e é revertido no sweep seguinte. Quem reconfirma volta com a cobrança `overdue`.
  - Decisão: *recomendação: quem confirma depois do prazo do evento ganha prazo próprio (ex.: 2 h após confirmar).*
  - Fazer: prazo por cobrança (novo campo `deadlineAt` em `Payment`); sweep usa esse prazo; reconfirmar reabre a cobrança como `pending` com novo prazo.
  - Arquivos: `apps/api/prisma/schema.prisma`, `apps/api/src/events/events.service.ts`, `apps/api/test/finance-on-confirm.ts`
  - Pronto quando: após o prazo, a pessoa promovida confirma e não é revertida no sweep seguinte.

- [ ] **I4 · Mover os sweeps para um cron** 🟡
  - Problema: `GET /events/:id` e `GET /finance` gravam no banco (expiram reservas, revertem confirmações, criam notificações), o que multiplica as corridas.
  - Fazer: `POST /internal/sweeps` protegido por `CRON_SECRET`; Vercel Cron a cada 5 min; rotas GET passam a só ler.
  - Arquivos: `apps/api/src/events/events.service.ts`, `apps/api/src/app.controller.ts`, `vercel.json` (novo)
  - Pronto quando: abrir um evento não gera escrita (conferido no log de queries).

- [ ] **I5 · Reconciliar `participant_count` já gravado** 🟠
  - Problema: S4, I1 e I2 podem já ter deixado contadores errados em produção.
  - Fazer: script `apps/api/scripts/reconcile-counts.ts` que recalcula confirmados + reservas `notified` por evento, com `--dry-run`.
  - Arquivos: `apps/api/scripts/reconcile-counts.ts`, `apps/api/package.json`
  - Pronto quando: dry-run em produção sem divergências após a correção.

- [ ] **I6 · Uma fonte de verdade para mensalistas** 🟡 ⚖️ decisão
  - Problema: `ensurePayment` cobra taxa por evento de mensalistas, enquanto o sweep os isenta. O sweep usa `GroupMember.memberType`; a tela usa `EventParticipant.isMonthly`, que nunca é preenchido.
  - Decisão: mensalista paga taxa por evento? *Recomendação: não.*
  - Fazer: `memberType` como fonte única; preencher `isMonthly` na confirmação ou remover o campo; `ensurePayment` pula mensalistas.
  - Arquivos: `apps/api/src/events/events.service.ts`, `apps/api/src/events/events.service.finance.spec.ts`
  - Pronto quando: spec cobre mensalista sem cobrança e avulso com cobrança.

## Fase 3 — Funcionalidades que não funcionam

- [ ] **F1 · Aceitar valores com centavos** 🔴
  - Problema: o DTO de grupo valida taxas com `@IsInt`, então R$ 62,50 dá 400. No evento, `parseFloat("25,50")` grava 25 sem avisar.
  - Fazer: `@IsNumber({ maxDecimalPlaces: 2 }) @Min(0)` nas taxas; `eventFee` vira number; `parseBRL` em `lib/utils.ts` aceitando `25,50` e `25.50`; inputs com `inputMode="decimal"` sem `type="number"`.
  - Arquivos: `apps/api/src/groups/groups.controller.ts`, `apps/api/src/events/events.controller.ts`, `events.service.ts`, `apps/web/lib/actions/groups.ts`, `apps/web/lib/utils.ts`, telas de criação de grupo e evento
  - Pronto quando: grupo com R$ 62,50 e evento com R$ 25,50 gravam exatamente esses valores.

- [ ] **F2 · Marcar presença, ausência, gols e assistências** 🔴
  - Problema: nada grava `present`/`absent` nem gols e assistências; ranking do grupo, ranking geral e estatísticas do perfil ficam sempre vazios.
  - Fazer: `POST /events/:id/attendance` (organizador, só depois do início) com `{ userId, status, goals, assists }[]`; tela de chamada no detalhe do evento.
  - Arquivos: `apps/api/src/events/events.controller.ts`, `events.service.ts`, `apps/web/app/(app)/groups/[groupId]/events/[eventId]/_client.tsx`, `apps/web/lib/actions/events.ts`
  - Pronto quando: após marcar presença, o jogador aparece no ranking do grupo, em `/ranking` e no perfil.

- [ ] **F3 · Contador de não lidas correto** 🟡
  - Problema: `unreadCount` é calculado sobre as 3 notificações retornadas; o badge nunca passa de 3.
  - Fazer: `notification.count({ where: { userId, isRead: false } })`.
  - Arquivos: `apps/api/src/dashboard/dashboard.service.ts`
  - Pronto quando: com 10 não lidas, o badge mostra 10.

- [ ] **F4 · Próximos eventos começando pelo mais próximo** 🟠
  - Problema: próximos eventos ordenados `desc` com `take: 20`; com mais de 20 futuros, somem os mais próximos.
  - Fazer: ordenar em `asc` no banco; ajustar a tela se depender da ordem antiga.
  - Arquivos: `apps/api/src/groups/groups.service.ts`, `apps/api/test/group-detail-pagination.ts`
  - Pronto quando: com 25 eventos futuros, o desta semana aparece.

- [ ] **F5 · Status do usuário fora da amostra de 20** 🟡
  - Problema: `my_status` é procurado entre os 20 primeiros participantes; o 21º confirmado aparece como não confirmado.
  - Fazer: buscar as participações do usuário em query separada.
  - Arquivos: `apps/api/src/groups/groups.service.ts`
  - Pronto quando: usuário na 21ª posição aparece como confirmado.

- [ ] **F6 · Decidir o destino da recorrência** 🟠 ⚖️ decisão
  - Problema: evento semanal só grava a RRULE; nenhuma ocorrência futura é criada. `monthlySlots` e `monthlyConfirmDeadline` nunca são usados.
  - Decisão: gerar ocorrências ou esconder a opção? *Recomendação: gerar 8 semanas à frente e completar pelo cron (I4).*
  - Fazer: gerar ocorrências (lib `rrule`) com `seriesId` comum; aplicar vagas de mensalista e prazo, ou remover os campos.
  - Arquivos: `apps/api/src/events/events.service.ts`, `apps/api/prisma/schema.prisma`
  - Pronto quando: criar evento semanal gera as próximas ocorrências no grupo.

- [ ] **F7 · Respeitar o limite de membros** 🟡
  - Problema: `maxMembers` nunca é verificado.
  - Fazer: checar membros ativos dentro da transação em `redeem` e `approveJoinRequest`.
  - Arquivos: `apps/api/src/invites/invites.service.ts`, `apps/api/src/groups/groups.service.ts`
  - Pronto quando: grupo cheio recusa convite e aprovação com mensagem clara.

- [ ] **F8 · Corrigir o resgate de convite** 🟠
  - Problema: `redeem` aceita grupo excluído; quem tem pedido pendente ou foi banido recebe "Você já é membro"; `maxUses` pode estourar sob concorrência.
  - Fazer: checar `deletedAt`; pendente vira ativo; banido recebe 403 próprio; incremento com `updateMany` condicional (`uses < maxUses`).
  - Arquivos: `apps/api/src/invites/invites.service.ts`, `apps/api/test/invite-attribution.ts`
  - Pronto quando: testes cobrem grupo excluído, pendente, banido e limite de usos.

- [ ] **F9 · Regras de convite por tipo de grupo** 🟡 ⚖️ decisão
  - Problema: qualquer membro gera convite, inclusive em grupo privado, e os códigos nunca expiram; "privado" e "por convite" funcionam igual.
  - Decisão: em grupo privado só organizadores geram convite? *Recomendação: sim, com validade padrão de 30 dias.*
  - Fazer: `assertGroupOrganizer` em grupo privado; validade e limite de usos; revogar pela tela de configurações.
  - Arquivos: `apps/api/src/groups/groups.service.ts`, `apps/web/app/(app)/groups/[groupId]/settings/_client.tsx`
  - Pronto quando: participante de grupo privado recebe 403 ao gerar convite; convite vencido é recusado.

- [ ] **F10 · Remover membro limpa as participações** 🟡
  - Problema: membro banido continua confirmado em eventos futuros ocupando vaga; organizador pode banir outro organizador.
  - Fazer: em transação, banir, recusar participações futuras (liberando vaga e promovendo a fila) e tirar da fila; organizador só remove participantes.
  - Arquivos: `apps/api/src/groups/groups.service.ts`
  - Pronto quando: remover alguém confirmado libera a vaga e chama o próximo da fila.

- [ ] **F11 · Validar paginação** ⚪
  - Problema: `?page=abc` vira `NaN` e gera erro nos dois `discover`.
  - Fazer: `DiscoverQueryDto` com `@Type(() => Number) @IsInt @Min(1) @Max(50)`.
  - Arquivos: `apps/api/src/events/events.controller.ts`, `apps/api/src/groups/groups.controller.ts`
  - Pronto quando: `?page=abc` retorna 400 com mensagem de validação.

- [ ] **F12 · SessionProvider resiliente** 🟡
  - Problema: se o fetch de `/users/me` falhar, `isLoading` fica `true` para sempre; o perfil é rebuscado a cada renovação de token.
  - Fazer: try/catch com `setUser(null)`; não rebuscar em `TOKEN_REFRESHED`; remover `setLoading` não usado.
  - Arquivos: `apps/web/components/providers/SessionProvider.tsx`
  - Pronto quando: com a API fora do ar, a tela sai do carregamento.

- [ ] **F13 · Filtros de status consistentes** ⚪
  - Problema: "meus eventos" usa `published` para grupo e `published`/`open` para avulso; a home usa outra combinação.
  - Fazer: constante `ACTIVE_EVENT_STATUSES` em `myEvents`, home e discover.
  - Arquivos: `apps/api/src/events/events.service.ts`, `apps/api/src/dashboard/dashboard.service.ts`
  - Pronto quando: os três lugares listam os mesmos eventos ativos.

## Fase 4 — Funcionalidades ausentes

- [ ] **N1 · Editar e cancelar evento** 🟠
  - Fazer: `PATCH /events/:id` e `POST /events/:id/cancel` com `assertEventManager`; cancelar notifica confirmados e cancela cobranças pendentes.
  - Arquivos: `apps/api/src/events/events.controller.ts`, `events.service.ts`, `apps/web/lib/actions/events.ts`
  - Pronto quando: organizador muda horário e cancela pela tela; confirmados são notificados.

- [ ] **N2 · Editar e excluir grupo** 🟡
  - Fazer: `PATCH /groups/:id` (admin) para nome, descrição, taxas, prazo e acesso; `DELETE /groups/:id` lógico (`deletedAt`); formulário em configurações.
  - Arquivos: `apps/api/src/groups/groups.controller.ts`, `groups.service.ts`, `apps/web/app/(app)/groups/[groupId]/settings/_client.tsx`
  - Pronto quando: admin altera a taxa por evento e ela vale para os próximos eventos.

- [ ] **N3 · Sair do grupo** 🟡
  - Fazer: `DELETE /groups/:id/members/me` com a mesma limpeza de F10; admin precisa transferir a administração antes.
  - Arquivos: `apps/api/src/groups/groups.controller.ts`, `groups.service.ts`
  - Pronto quando: participante sai pela tela e some da lista de membros.

- [ ] **N4 · Minhas cobranças** 🟡
  - Fazer: `GET /payments/mine`; seção no perfil com valor, prazo e chave PIX copiável (`Group.pixKey`).
  - Arquivos: `apps/api/src/payments/payments.controller.ts`, `payments.service.ts`, `apps/web/app/(app)/profile/_client.tsx`
  - Pronto quando: jogador confirmado em evento pago vê a cobrança e copia a chave PIX.

## Fase 5 — Qualidade de código e testes

- [ ] **Q1 · DTOs em arquivos próprios** 🟡 — mover as classes para `dto/` em cada módulo e remover as interfaces duplicadas nos services (`CreateEventDto`, `CreateGroupDto`).
- [ ] **Q2 · Validação completa dos DTOs** 🟠 — `@MaxLength` em nome/bio/notas; `@Matches` para `YYYY-MM-DD` e `HH:mm`; `@IsIn` para `weekDays` e `sport` (a partir de `SPORTS`); `@Min(1) @Max(31)` em `paymentDay`; `@IsUrl` em `avatarUrl`. Pronto quando data inválida retorna 400 sem chegar ao Prisma.
- [ ] **Q3 · Transações onde há várias escritas** 🟡 — `groups.create` (grupo + membro admin), aprovação + notificação e afins.
- [ ] **Q4 · Ranking agregado no banco** 🟡 — `groupBy` por `userId` com `_count` e `_max` da data; `dashboard.ranking` em uma query. Depende de F2 para ter dados.
- [ ] **Q5 · Mappers tipados com `@playgroup/types`** 🟡 — `toEventDto`, `toMemberDto` etc.; retornos dos services anotados (sem `user: unknown`); migrar as interfaces duplicadas em `apps/web/lib/actions/`.
- [ ] **Q6 · Remover código morto** ⚪ — fallbacks `nickname ?? name.split(...)` (nickname é obrigatório no schema) e variáveis não usadas.
- [ ] **Q7 · Dividir o `EventsService`** 🟡 — extrair `WaitlistService` e `ParticipationService` (reaproveitado por S4); nenhum service acima de ~400 linhas.
- [ ] **Q8 · Testes de regressão em Jest + supertest** 🟠 — migrar `apps/api/test/*.ts` para uma suíte e2e única no CI, com casos de S2, S3, S4, I1 e I2.

## Fase 6 — Infra e documentação

- [ ] **D1 · Tirar `packages/*/dist` do git e limpar o `.gitignore`** ⚪ — ignorar e remover do índice; revisar entradas soltas (`references`, `exact-replication-dev`).
- [ ] **D2 · Atualizar o AGENTS.md** 🟡 — hoje diz que não existe `.env.example`, que o logger não foi adotado, cita `data/mock` e `eventos/descobrir`, omite várias rotas e descreve o CI de forma incompleta.
- [ ] **D3 · Fixar a versão do Node** ⚪ — `.nvmrc` com 22 e `"engines": { "node": ">=22" }` na raiz.
