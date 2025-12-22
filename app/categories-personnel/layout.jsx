import { Sidebar } from '@/components/layout/sidebar'
import { Footer } from '@/components/layout/footer'

export default function CategoriesPersonnelLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 lg:ml-0">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pt-16 lg:pt-4">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  )
}

