import Link from 'next/link'
import { obtenerSecciones } from '@/app/lib/feed'

// Header del hub público: logo + navegación por secciones. Server component
// (lee las secciones de la BD). La sección activa se resalta vía `activa`.
export default async function HubHeader({ activa }: { activa?: string }) {
  const secciones = await obtenerSecciones()

  return (
    <header className="border-b border-line bg-base/95 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/hub" className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-brand animate-pulse" />
            <span className="font-bold text-snow tracking-tight">EZ Trader</span>
            <span className="text-muted text-sm hidden sm:inline">· Noticias</span>
          </Link>
          <Link
            href="/"
            className="text-xs text-muted hover:text-brand transition-colors"
            title="Acceso a la herramienta de trading (requiere login)"
          >
            Ingresar
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto pb-2 -mb-px scrollbar-none">
          <NavItem href="/hub" label="Portada" activo={!activa} />
          {secciones.map((s) => (
            <NavItem
              key={s.codigo}
              href={`/hub/seccion/${s.codigo}`}
              label={s.nombre}
              activo={activa === s.codigo}
            />
          ))}
        </nav>
      </div>
    </header>
  )
}

function NavItem({ href, label, activo }: { href: string; label: string; activo: boolean }) {
  return (
    <Link
      href={href}
      className={`whitespace-nowrap px-3 py-1.5 text-sm rounded-lg transition-colors ${
        activo ? 'bg-brand/15 text-brand font-medium' : 'text-muted hover:text-snow hover:bg-panel'
      }`}
    >
      {label}
    </Link>
  )
}
