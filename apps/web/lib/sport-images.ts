import type { SportId } from './constants'

/**
 * Fotos do Pexels (licença livre, sem crédito exigido) usadas como capa por
 * esporte — servidas via hotlink direto na CDN deles, sem download/hospedagem
 * própria. IDs conferidos manualmente pra bater com o esporte.
 */
const SPORT_COVER_PHOTO_ID: Record<SportId, string> = {
  football: '186239',
  futsal: '16378322',
  volleyball: '6180430',
  beach: '36824304',
  tennis: '3845084',
  basketball: '8979885',
  kart: '5640603',
  cycling: '5807633',
  running: '5319373',
  bbq: '8021315',
  other: '8694457',
}

export function getSportCoverUrl(sport: SportId, width = 640): string {
  const photoId = SPORT_COVER_PHOTO_ID[sport] ?? SPORT_COVER_PHOTO_ID.other
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`
}
