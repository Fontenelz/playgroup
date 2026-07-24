/**
 * Valida a feature "convidado por": quando alguém entra num grupo usando o
 * código de convite de outra pessoa, a lista de membros (GroupsService.getDetail)
 * deve indicar quem convidou. Roda contra um Postgres real.
 *
 * Uso: pnpm --filter api test:invite-attribution
 */
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { GroupsService } from '../src/groups/groups.service'
import { InvitesService } from '../src/invites/invites.service'
import { PrismaService } from '../src/prisma/prisma.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Teste invite-attribution falhou: ${message}`)
}

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false })
  await app.init()

  const prisma = app.get(PrismaService)
  const groups = app.get(GroupsService)
  const invites = app.get(InvitesService)

  const adminId = randomUUID()
  const inviterId = randomUUID() // organizador que gera o convite usado
  const joinerId = randomUUID() // quem entra usando o código do inviter
  const directId = randomUUID() // membro adicionado direto (sem convite) — controle negativo
  let groupId = ''

  try {
    await prisma.user.createMany({
      data: [
        { id: adminId, name: 'Invite Admin', nickname: 'Admin' },
        { id: inviterId, name: 'Invite Inviter', nickname: 'Convidador' },
        { id: joinerId, name: 'Invite Joiner', nickname: 'Novato' },
        { id: directId, name: 'Invite Direct', nickname: 'Direto' },
      ],
    })

    const group = await groups.create(adminId, {
      sport: 'football',
      name: 'Grupo Invite Attribution Test',
      accessType: 'invite',
      maxMembers: 20,
    })
    groupId = group.id

    // inviterId precisa ser membro do grupo pra poder gerar um código.
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: inviterId,
        role: 'organizer',
        memberType: 'regular',
        status: 'active',
      },
    })
    // membro adicionado direto, sem passar por convite nenhum — controle negativo.
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: directId,
        role: 'participant',
        memberType: 'regular',
        status: 'active',
      },
    })

    const { code } = await groups.createInviteCode(groupId, inviterId)
    await invites.redeem(code, joinerId)

    const detail = await groups.getDetail(groupId, adminId)

    const joinerMember = detail.members.find((m) => m.user_id === joinerId)
    assert(
      joinerMember !== undefined,
      'quem entrou pelo convite deveria aparecer na lista de membros',
    )
    assert(
      joinerMember?.invited_by?.id === inviterId,
      `invited_by deveria apontar pra ${inviterId}, veio ${JSON.stringify(joinerMember?.invited_by)}`,
    )
    assert(
      joinerMember?.invited_by?.nickname === 'Convidador',
      'invited_by deveria trazer o nickname de quem convidou',
    )

    const directMember = detail.members.find((m) => m.user_id === directId)
    assert(directMember !== undefined, 'membro adicionado direto deveria aparecer na lista')
    assert(
      directMember?.invited_by === null,
      'membro que não entrou por convite não deveria ter invited_by',
    )

    const adminMember = detail.members.find((m) => m.user_id === adminId)
    assert(adminMember?.invited_by === null, 'admin/criador do grupo não deveria ter invited_by')

    console.log(
      `✔ invite-attribution: membro que entrou pelo convite de ${inviterId.slice(0, 8)} aparece como "convidado por" na lista`,
    )
  } finally {
    if (groupId) {
      await prisma.groupMember.deleteMany({ where: { groupId } })
      await prisma.inviteCode.deleteMany({ where: { groupId } })
      await prisma.group.delete({ where: { id: groupId } }).catch(() => {})
    }
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, inviterId, joinerId, directId] } },
    })
    await app.close()
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
