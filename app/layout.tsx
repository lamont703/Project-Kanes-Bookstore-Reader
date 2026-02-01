import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Bebas_Neue } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: "Kane's Komets Book Club - The Funkiest Bookstore in the Universe",
  description: "Discover Komet reads and join our book club. Read, collect, and explore books from across the galaxy.",
  generator: "v0.app",
  icons: {
    icon: "/kanes-komets-icon.png",
    apple: "/kanes-komets-icon.png",
  },
}

import { Providers } from "@/components/providers"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased ${_bebasNeue.variable}`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
