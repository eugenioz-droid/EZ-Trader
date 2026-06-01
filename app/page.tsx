import { Suspense } from 'react'
import PanelNoticias from './components/noticias/PanelNoticias'
import PanelCotizacion from './components/cotizacion/PanelCotizacion'
import HistorialCotizacion from './components/cotizacion/HistorialCotizacion'
import PanelFactores from './components/cotizacion/PanelFactores'
import PanelAgente from './components/agente/PanelAgente'
import BotonRefresh from './components/ui/BotonRefresh'
import BotonBriefing from './components/ui/BotonBriefing'
import UltimaActualizacion from './components/ui/UltimaActualizacion'
import PanelAlertas from './components/ui/PanelAlertas'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fuente?: string }>
}) {
  const { fuente } = await searchParams

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Header */}
      <header className="border-b border-gray-800 px-4 lg:px-6 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <span className="text-lg lg:text-xl font-bold tracking-tight">EZ Trader</span>
          <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">USD/CLP</span>
        </div>
        <div className="flex items-center gap-2 lg:gap-3 flex-wrap justify-end">
          <Suspense fallback={null}>
            <UltimaActualizacion />
          </Suspense>
          <PanelAlertas />
          <BotonBriefing />
          <BotonRefresh />
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            En vivo · cada 15 min
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 px-4 lg:px-6">
        <nav className="flex gap-1">
          <button className="px-4 py-2 text-sm border-b-2 border-blue-500 text-blue-400 font-medium">
            USD / CLP
          </button>
          <button className="px-4 py-2 text-sm text-gray-500 cursor-not-allowed" disabled>
            + Instrumento
          </button>
        </nav>
      </div>

      {/* Móvil: cotización primero */}
      <div className="lg:hidden border-b border-gray-800">
        <Suspense fallback={<CargandoPanel texto="Cargando mercado..." />}>
          <PanelCotizacion />
        </Suspense>
        <Suspense fallback={null}>
          <HistorialCotizacion />
        </Suspense>
        <Suspense fallback={<CargandoPanel texto="Cargando factores..." />}>
          <PanelFactores />
        </Suspense>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:h-[calc(100vh-89px)]">

        {/* Columna izquierda: Noticias */}
        <div className="lg:col-span-1 border-r border-gray-800 lg:overflow-y-auto">
          <Suspense fallback={<CargandoPanel texto="Cargando noticias..." />}>
            <PanelNoticias fuente={fuente} />
          </Suspense>
        </div>

        {/* Columna central: Cotización + Gráfico + Factores (solo desktop) */}
        <div className="hidden lg:block lg:col-span-1 border-r border-gray-800 overflow-y-auto">
          <Suspense fallback={<CargandoPanel texto="Cargando mercado..." />}>
            <PanelCotizacion />
          </Suspense>
          <Suspense fallback={null}>
            <HistorialCotizacion />
          </Suspense>
          <Suspense fallback={<CargandoPanel texto="Cargando factores..." />}>
            <PanelFactores />
          </Suspense>
        </div>

        {/* Columna derecha: Agente */}
        <div className="lg:col-span-1 lg:overflow-y-auto border-t lg:border-t-0 border-gray-800">
          <PanelAgente />
        </div>

      </div>
    </div>
  )
}

function CargandoPanel({ texto }: { texto: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
      <span className="animate-pulse">{texto}</span>
    </div>
  )
}
