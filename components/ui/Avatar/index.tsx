import Image from 'next/image'
import { getInitials, getAvatarColor, cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-xl',
}

const imgSizes = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 }

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)
  const color = getAvatarColor(name)

  if (src) {
    return (
      <div className={cn('rounded-full overflow-hidden flex-shrink-0', sizes[size], className)}>
        <Image src={src} alt={name} width={imgSizes[size]} height={imgSizes[size]} className="object-cover w-full h-full" />
      </div>
    )
  }

  return (
    <div className={cn('rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white', sizes[size], color, className)}>
      {initials}
    </div>
  )
}

interface AvatarGroupProps {
  users: Array<{ name: string; avatar_url?: string }>
  max?: number
  size?: AvatarProps['size']
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const extra = users.length - max

  return (
    <div className="flex items-center">
      {visible.map((u, i) => (
        <div key={i} className={cn('-ml-1.5 first:ml-0 ring-2 ring-slate-900 rounded-full')}>
          <Avatar name={u.name} src={u.avatar_url} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div className={cn('-ml-1.5 ring-2 ring-slate-900 rounded-full flex items-center justify-center bg-slate-700 text-slate-300 font-semibold', sizes[size], { xs: 'text-[9px]', sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm', xl: 'text-base' }[size])}>
          +{extra}
        </div>
      )}
    </div>
  )
}
