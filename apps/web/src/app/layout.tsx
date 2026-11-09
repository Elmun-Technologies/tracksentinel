import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TrackSentinel — Meta Pixel Monitoring',
  description: 'Know when your Meta tracking breaks — before it costs you money.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
