import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getGuestEventPreview } from '@/lib/actions/events'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { getSportCoverUrl } from '@/lib/sport-images'
import GuestEventClient, { InvalidEventView, AuthRequiredView } from './_client'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>
}): Promise<Metadata> {
  const { eventId } = await params
  const { event } = await getGuestEventPreview(eventId)

  if (!event) {
    return { title: 'Evento — PlayGroup' }
  }

  const sport = SPORT_MAP[event.sport as SportId] ?? SPORT_MAP.other
  const title = `${event.title} — PlayGroup`
  const description = event.groupName
    ? `${sport.emoji} ${sport.label} · ${event.groupName}. Confirme sua presença pelo PlayGroup.`
    : `${sport.emoji} ${sport.label} · Evento avulso. Confirme sua presença pelo PlayGroup.`
  const image = getSportCoverUrl(event.sport as SportId, 1200)

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 900 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

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
