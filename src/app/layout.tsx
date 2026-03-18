import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/providers/query-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { Toaster } from 'sonner'
import { InstallPrompt } from '@/components/pwa/install-prompt'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'Clean Del Sol',
  description: 'Cleaning service management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Clean Del Sol',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
              <Toaster position="bottom-center" />
              <InstallPrompt />
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
