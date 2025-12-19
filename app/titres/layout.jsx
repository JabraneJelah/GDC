import { Nav } from '@/components/layout/nav'

export default function TitresLayout({ children }) {
  return (
    <>
      <Nav />
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">{children}</main>
    </>
  )
}

