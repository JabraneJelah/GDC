import { Nav } from '@/components/layout/nav'

export default function DashboardLayout({ children }) {
  return (
    <>
      <Nav />
      <main className="container mx-auto max-w-7xl px-4 py-8">{children}</main>
    </>
  )
}

