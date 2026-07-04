import { redirect } from 'next/navigation'
import { getGuestEventPreview } from '@/lib/actions/events'
import GuestEventClient, { InvalidEventView, AuthRequiredView } from './_client'

export default async function GuestEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const { event, error, authRequired } = await getGuestEventPreview(eventId)

  if (authRequired) {
    return <AuthRequiredView eventId={eventId} />
  }

  if (error || !event) {
    return <InvalidEventView message={error} />
  }

  // Membro do grupo já tem a página completa do evento; manda pra lá.
  // (evento avulso não tem grupo, então fica sempre nesta página)
  if (event.groupId && event.isMember) {
    redirect(`/groups/${event.groupId}/events/${event.id}`)
  }

  return <GuestEventClient event={event} />
}
