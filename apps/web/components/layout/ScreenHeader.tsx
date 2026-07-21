import type { ReactNode } from 'react'

interface ScreenHeaderProps {
  icon: ReactNode
  title: string
  subtitle: string
  right?: ReactNode
}

/** Header das telas-raiz (sem botão voltar): ícone + título + subtítulo. */
export function ScreenHeader({ icon, title, subtitle, right }: ScreenHeaderProps) {
  return (
    <div className="flex items-start gap-3 px-5 pt-4 pb-4">
      <div className="size-11 rounded-xl bg-primary-500/15 border border-primary-500/40 flex items-center justify-center text-primary-400 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-slate-100 leading-tight">{title}</h1>
        <p className="text-sm text-slate-400 truncate">{subtitle}</p>
      </div>
      {right}
    </div>
  )
}
