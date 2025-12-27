import "./globals.css"
import Link from "next/link"

export const metadata = {
  title: "Equity Marketplace",
  description: "Hire talent with equity, not cash",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Equity Marketplace
            </Link>

            <div className="flex gap-6">
              <Link href="/founders" className="text-sm font-medium hover:underline">
                For Founders
              </Link>
              <Link href="/providers" className="text-sm font-medium hover:underline">
                For Providers
              </Link>
              <Link
                href="/signin"
                className="text-sm font-medium px-4 py-2 rounded bg-black text-white"
              >
                Sign In
              </Link>
            </div>
          </nav>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-12">
          {children}
        </main>
      </body>
    </html>
  )
}
