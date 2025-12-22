export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
          <footer className="border-t border-[#E2E8F0] bg-white mt-auto">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#334155]">
          <p className="text-center sm:text-left">
            © {currentYear} Gestion des Congés des Professeurs. Tous droits réservés.
          </p>
          <p className="text-center sm:text-right text-xs text-[#64748B]">
            Application interne RH
          </p>
        </div>
      </div>
    </footer>
  )
}

