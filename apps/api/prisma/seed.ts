import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

const DAY = 24 * 60 * 60 * 1000
const now = new Date()
const daysFromNow = (n: number) => new Date(now.getTime() + n * DAY)

const users = {
  matheus: '11111111-1111-4111-8111-111111111111',
  ana: '11111111-1111-4111-8111-111111111112',
  bruno: '11111111-1111-4111-8111-111111111113',
  carla: '11111111-1111-4111-8111-111111111114',
  diego: '11111111-1111-4111-8111-111111111115',
  elisa: '11111111-1111-4111-8111-111111111116',
}

const groups = {
  pelada: '21111111-1111-4111-8111-211111111111',
  volei: '21111111-1111-4111-8111-211111111112',
}

const events = {
  peladaPassada: '31111111-1111-4111-8111-311111111111',
  peladaAberta: '31111111-1111-4111-8111-311111111112',
  peladaRascunho: '31111111-1111-4111-8111-311111111113',
  voleiPublicado: '31111111-1111-4111-8111-311111111114',
  voleiPassado: '31111111-1111-4111-8111-311111111115',
}

async function seedUsers() {
  await prisma.user.upsert({
    where: { id: users.matheus },
    update: { email: 'matheus@playgroup.test' },
    create: {
      id: users.matheus,
      email: 'matheus@playgroup.test',
      name: 'Matheus Fontenele',
      nickname: 'Fontenele',
      city: 'Fortaleza',
      bio: 'Organizador da pelada de sábado.',
      sports: ['futebol', 'volei'],
      skillLevel: 'advanced',
    },
  })
  await prisma.user.upsert({
    where: { id: users.ana },
    update: { email: 'ana@playgroup.test' },
    create: {
      id: users.ana,
      email: 'ana@playgroup.test',
      name: 'Ana Souza',
      nickname: 'Aninha',
      city: 'Fortaleza',
      sports: ['futebol'],
      skillLevel: 'intermediate',
    },
  })
  await prisma.user.upsert({
    where: { id: users.bruno },
    update: { email: 'bruno@playgroup.test' },
    create: {
      id: users.bruno,
      email: 'bruno@playgroup.test',
      name: 'Bruno Lima',
      nickname: 'Bruno',
      city: 'Fortaleza',
      sports: ['futebol'],
      skillLevel: 'professional',
    },
  })
  await prisma.user.upsert({
    where: { id: users.carla },
    update: { email: 'carla@playgroup.test' },
    create: {
      id: users.carla,
      email: 'carla@playgroup.test',
      name: 'Carla Dias',
      nickname: 'Carlinha',
      city: 'Fortaleza',
      sports: ['volei'],
      skillLevel: 'beginner',
    },
  })
  await prisma.user.upsert({
    where: { id: users.diego },
    update: { email: 'diego@playgroup.test' },
    create: {
      id: users.diego,
      email: 'diego@playgroup.test',
      name: 'Diego Alves',
      nickname: 'Diego',
      city: 'Maracanaú',
      sports: ['futebol', 'volei'],
      skillLevel: 'intermediate',
    },
  })
  await prisma.user.upsert({
    where: { id: users.elisa },
    update: {},
    create: {
      id: users.elisa,
      name: 'Elisa Martins',
      nickname: 'Lili',
      city: 'Fortaleza',
      sports: [],
      skillLevel: 'beginner',
      isGuest: true,
    },
  })
}

async function seedGroups() {
  await prisma.group.upsert({
    where: { id: groups.pelada },
    update: {},
    create: {
      id: groups.pelada,
      name: 'Pelada dos Amigos',
      slug: 'pelada-dos-amigos',
      description: 'Futebol society toda semana.',
      sport: 'futebol',
      adminId: users.matheus,
      accessType: 'invite',
      maxMembers: 20,
      monthlyFee: '50.00',
      perEventFee: '15.00',
      paymentDay: 10,
      pixKey: 'matheus@pix.com',
      plan: 'pro',
    },
  })
  await prisma.group.upsert({
    where: { id: groups.volei },
    update: {},
    create: {
      id: groups.volei,
      name: 'Vôlei de Quinta',
      slug: 'volei-de-quinta',
      description: 'Vôlei recreativo entre amigos.',
      sport: 'volei',
      adminId: users.carla,
      accessType: 'public',
      maxMembers: 12,
      perEventFee: '10.00',
      plan: 'free',
    },
  })
}

async function seedGroupMembers() {
  const members: Array<{
    groupId: string
    userId: string
    role: 'admin' | 'organizer' | 'participant'
    memberType: 'monthly' | 'regular' | 'guest'
    status: 'pending' | 'active' | 'suspended' | 'banned'
    monthlySlot?: boolean
    skillRating?: number
  }> = [
    { groupId: groups.pelada, userId: users.matheus, role: 'admin', memberType: 'monthly', status: 'active', monthlySlot: true, skillRating: 5 },
    { groupId: groups.pelada, userId: users.ana, role: 'participant', memberType: 'regular', status: 'active', skillRating: 3 },
    { groupId: groups.pelada, userId: users.bruno, role: 'organizer', memberType: 'monthly', status: 'active', monthlySlot: true, skillRating: 5 },
    { groupId: groups.pelada, userId: users.diego, role: 'participant', memberType: 'regular', status: 'active', skillRating: 3 },
    { groupId: groups.pelada, userId: users.elisa, role: 'participant', memberType: 'guest', status: 'pending', skillRating: 2 },
    { groupId: groups.volei, userId: users.carla, role: 'admin', memberType: 'monthly', status: 'active', monthlySlot: true, skillRating: 4 },
    { groupId: groups.volei, userId: users.ana, role: 'participant', memberType: 'regular', status: 'active', skillRating: 3 },
    { groupId: groups.volei, userId: users.diego, role: 'participant', memberType: 'regular', status: 'active', skillRating: 3 },
  ]

  for (const member of members) {
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: member.groupId, userId: member.userId } },
      update: {},
      create: member,
    })
  }
}

async function seedInviteCodes() {
  await prisma.inviteCode.upsert({
    where: { code: 'PELADA2026' },
    update: {},
    create: {
      groupId: groups.pelada,
      code: 'PELADA2026',
      createdBy: users.matheus,
      maxUses: 50,
      uses: 12,
    },
  })
  await prisma.inviteCode.upsert({
    where: { code: 'VOLEIQUI' },
    update: {},
    create: {
      groupId: groups.volei,
      code: 'VOLEIQUI',
      createdBy: users.carla,
      maxUses: 20,
      uses: 5,
      expiresAt: daysFromNow(30),
    },
  })
}

async function seedEvents() {
  await prisma.event.upsert({
    where: { id: events.peladaPassada },
    update: {},
    create: {
      id: events.peladaPassada,
      groupId: groups.pelada,
      title: 'Pelada de sábado passado',
      sport: 'futebol',
      startsAt: daysFromNow(-7),
      endsAt: new Date(daysFromNow(-7).getTime() + 90 * 60 * 1000),
      locationName: 'Arena Society Central',
      locationAddress: 'Rua das Flores, 100',
      maxParticipants: 14,
      participantCount: 4,
      status: 'completed',
      eventFee: '15.00',
      createdBy: users.matheus,
    },
  })
  await prisma.event.upsert({
    where: { id: events.peladaAberta },
    update: {},
    create: {
      id: events.peladaAberta,
      groupId: groups.pelada,
      title: 'Pelada de sábado que vem',
      sport: 'futebol',
      startsAt: daysFromNow(3),
      endsAt: new Date(daysFromNow(3).getTime() + 90 * 60 * 1000),
      locationName: 'Arena Society Central',
      locationAddress: 'Rua das Flores, 100',
      maxParticipants: 3,
      participantCount: 3,
      status: 'open',
      eventFee: '15.00',
      createdBy: users.matheus,
    },
  })
  await prisma.event.upsert({
    where: { id: events.peladaRascunho },
    update: {},
    create: {
      id: events.peladaRascunho,
      groupId: groups.pelada,
      title: 'Pelada mensal (recorrente)',
      sport: 'futebol',
      startsAt: daysFromNow(30),
      endsAt: new Date(daysFromNow(30).getTime() + 90 * 60 * 1000),
      maxParticipants: 14,
      monthlySlots: 8,
      status: 'draft',
      isRecurring: true,
      recurrenceRule: 'FREQ=MONTHLY;BYDAY=SA',
      monthlyConfirmDeadline: daysFromNow(25),
      eventFee: '15.00',
      createdBy: users.matheus,
    },
  })
  await prisma.event.upsert({
    where: { id: events.voleiPublicado },
    update: {},
    create: {
      id: events.voleiPublicado,
      groupId: groups.volei,
      title: 'Vôlei de quinta',
      sport: 'volei',
      startsAt: daysFromNow(4),
      endsAt: new Date(daysFromNow(4).getTime() + 60 * 60 * 1000),
      locationName: 'Quadra do Bairro',
      maxParticipants: 12,
      participantCount: 2,
      status: 'published',
      eventFee: '10.00',
      createdBy: users.carla,
    },
  })
  await prisma.event.upsert({
    where: { id: events.voleiPassado },
    update: {},
    create: {
      id: events.voleiPassado,
      groupId: groups.volei,
      title: 'Vôlei de quinta passada',
      sport: 'volei',
      startsAt: daysFromNow(-4),
      endsAt: new Date(daysFromNow(-4).getTime() + 60 * 60 * 1000),
      locationName: 'Quadra do Bairro',
      maxParticipants: 12,
      participantCount: 2,
      status: 'completed',
      eventFee: '10.00',
      createdBy: users.carla,
    },
  })
}

async function seedEventParticipants() {
  const participants: Array<{
    eventId: string
    userId: string
    status: 'confirmed' | 'pending' | 'declined' | 'absent' | 'present'
    isMonthly?: boolean
    confirmedAt?: Date
    goals?: number
    assists?: number
    isLateCancel?: boolean
  }> = [
    { eventId: events.peladaPassada, userId: users.matheus, status: 'present', isMonthly: true, confirmedAt: daysFromNow(-8), goals: 2, assists: 1 },
    { eventId: events.peladaPassada, userId: users.bruno, status: 'present', isMonthly: true, confirmedAt: daysFromNow(-8), goals: 3, assists: 0 },
    { eventId: events.peladaPassada, userId: users.ana, status: 'present', confirmedAt: daysFromNow(-8), goals: 0, assists: 2 },
    { eventId: events.peladaPassada, userId: users.diego, status: 'absent', confirmedAt: daysFromNow(-8), isLateCancel: true },

    { eventId: events.peladaAberta, userId: users.matheus, status: 'confirmed', isMonthly: true, confirmedAt: now },
    { eventId: events.peladaAberta, userId: users.bruno, status: 'confirmed', isMonthly: true, confirmedAt: now },
    { eventId: events.peladaAberta, userId: users.ana, status: 'confirmed', confirmedAt: now },

    { eventId: events.voleiPublicado, userId: users.carla, status: 'confirmed', isMonthly: true, confirmedAt: now },
    { eventId: events.voleiPublicado, userId: users.diego, status: 'pending' },

    { eventId: events.voleiPassado, userId: users.carla, status: 'present', isMonthly: true, confirmedAt: daysFromNow(-5) },
    { eventId: events.voleiPassado, userId: users.ana, status: 'present', confirmedAt: daysFromNow(-5) },
  ]

  for (const participant of participants) {
    await prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId: participant.eventId, userId: participant.userId } },
      update: {},
      create: participant,
    })
  }
}

async function seedWaitlist() {
  await prisma.waitlist.upsert({
    where: { eventId_userId: { eventId: events.peladaAberta, userId: users.diego } },
    update: {},
    create: {
      eventId: events.peladaAberta,
      userId: users.diego,
      position: 1,
      status: 'waiting',
      joinedAt: now,
    },
  })
  await prisma.waitlist.upsert({
    where: { eventId_userId: { eventId: events.peladaAberta, userId: users.elisa } },
    update: {},
    create: {
      eventId: events.peladaAberta,
      userId: users.elisa,
      position: 2,
      status: 'waiting',
      joinedAt: now,
    },
  })
}

async function seedPayments() {
  const payments = [
    {
      id: '41111111-1111-4111-8111-411111111111',
      groupId: groups.pelada,
      userId: users.matheus,
      type: 'monthly' as const,
      amount: '50.00',
      status: 'paid' as const,
      dueDate: daysFromNow(-20),
      paidAt: daysFromNow(-19),
      referenceMonth: daysFromNow(-20),
      paidBy: users.matheus,
    },
    {
      id: '41111111-1111-4111-8111-411111111112',
      groupId: groups.pelada,
      userId: users.bruno,
      type: 'monthly' as const,
      amount: '50.00',
      status: 'overdue' as const,
      dueDate: daysFromNow(-5),
      referenceMonth: daysFromNow(-20),
    },
    {
      id: '41111111-1111-4111-8111-411111111113',
      groupId: groups.pelada,
      userId: users.ana,
      eventId: events.peladaPassada,
      type: 'per_event' as const,
      amount: '15.00',
      status: 'paid' as const,
      dueDate: daysFromNow(-7),
      paidAt: daysFromNow(-7),
      paidBy: users.ana,
    },
    {
      id: '41111111-1111-4111-8111-411111111114',
      groupId: groups.pelada,
      userId: users.diego,
      eventId: events.peladaPassada,
      type: 'fine' as const,
      amount: '10.00',
      status: 'pending' as const,
      dueDate: daysFromNow(2),
      notes: 'Cancelamento em cima da hora.',
    },
    {
      id: '41111111-1111-4111-8111-411111111115',
      groupId: groups.volei,
      userId: users.carla,
      eventId: events.voleiPassado,
      type: 'per_event' as const,
      amount: '10.00',
      status: 'paid' as const,
      dueDate: daysFromNow(-4),
      paidAt: daysFromNow(-4),
      paidBy: users.carla,
    },
  ]

  for (const payment of payments) {
    await prisma.payment.upsert({
      where: { id: payment.id },
      update: {},
      create: payment,
    })
  }
}

async function seedNotifications() {
  const notifications = [
    {
      id: '51111111-1111-4111-8111-511111111111',
      userId: users.matheus,
      type: 'payment_overdue',
      title: 'Pagamento em atraso',
      body: 'Bruno Lima está com a mensalidade em atraso.',
    },
    {
      id: '51111111-1111-4111-8111-511111111112',
      userId: users.bruno,
      type: 'payment_due',
      title: 'Mensalidade pendente',
      body: 'Sua mensalidade da Pelada dos Amigos venceu.',
    },
    {
      id: '51111111-1111-4111-8111-511111111113',
      userId: users.diego,
      type: 'waitlist_position',
      title: 'Você está na lista de espera',
      body: 'Você é o 1º da lista de espera para Pelada de sábado que vem.',
    },
    {
      id: '51111111-1111-4111-8111-511111111114',
      userId: users.ana,
      type: 'event_reminder',
      title: 'Evento amanhã',
      body: 'Vôlei de quinta acontece em breve, confirme sua presença.',
      isRead: true,
    },
  ]

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: {},
      create: notification,
    })
  }
}

async function main() {
  await seedUsers()
  await seedGroups()
  await seedGroupMembers()
  await seedInviteCodes()
  await seedEvents()
  await seedEventParticipants()
  await seedWaitlist()
  await seedPayments()
  await seedNotifications()
}

main()
  .then(async () => {
    console.log('Seed concluído com sucesso.')
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
