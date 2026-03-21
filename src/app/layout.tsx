'use client'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>Trybe</title>
        <meta name="description" content="Trybe - Live streaming & social platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="bg-black text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
