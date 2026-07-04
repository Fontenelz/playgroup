'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function BottomSheet({ isOpen, onClose, title, children, className }: BottomSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700',
              'rounded-t-3xl shadow-2xl max-w-lg mx-auto',
              'safe-bottom',
              className,
            )}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                <h3 className="text-base font-semibold text-slate-100">{title}</h3>
                <button
                  onClick={onClose}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
