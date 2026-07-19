import Image from 'next/image'
import { SPORT_MAP } from '@/lib/constants'
import type { SportId } from '@/lib/constants'
import { getSportCoverUrl } from '@/lib/sport-images'
import { cn } from '@/lib/utils'

interface SportCoverProps {
  sport: SportId
  size?: 'sm' | 'md' | 'lg' | 'banner'
  className?: string
  priority?: boolean
}

const boxSizes = { sm: 'size-9', md: 'size-12', lg: 'size-16' }
const imgWidths = { sm: 80, md: 96, lg: 128 }

/** Foto de capa por esporte (Pexels, hotlink). Contraparte "fotográfica" do SportIcon. */
export function SportCover({ sport, size = 'md', className, priority }: SportCoverProps) {
  const s = SPORT_MAP[sport] ?? SPORT_MAP.other

  if (size === 'banner') {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <Image
          src={getSportCoverUrl(sport, 800)}
          alt={s.label}
          fill
          sizes="(min-width: 640px) 512px, 100vw"
          priority={priority}
          className="object-cover"
        />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl flex-shrink-0', boxSizes[size], className)}>
      <Image
        src={getSportCoverUrl(sport, imgWidths[size])}
        alt={s.label}
        fill
        sizes={`${imgWidths[size]}px`}
        priority={priority}
        className="object-cover"
      />
    </div>
  )
}
