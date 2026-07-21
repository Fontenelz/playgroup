import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { SessionProvider } from '@/components/providers/SessionProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const title = 'PlayGroup — Organize qualquer esporte sem listas no WhatsApp'
const description = 'Confirme presenças, gerencie pagamentos, sorteie times e acompanhe rankings no seu grupo esportivo.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title,
  description,
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'PlayGroup' },
  openGraph: {
    title,
    description,
    siteName: 'PlayGroup',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
}

export const viewport: Viewport = {
  themeColor: '#090E11',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#202528',
              color: '#F8F8F8',
              border: '1px solid #2C3135',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#14191C' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#14191C' } },
          }}
        />
      </body>
    </html>
  )
}
