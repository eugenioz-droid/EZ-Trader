import { Suspense } from 'react'
import PanelNoticias from './components/noticias/PanelNoticias'
import PanelCotizacion from './components/cotizacion/PanelCotizacion'
import PanelFactores from './components/cotizacion/PanelFactores'
import PanelAgente from './components/agente/PanelAgente'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight">EZ Trader</span>
          <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">USD/CLP</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          En vivo · actualiza cada 15 min
        </div>
      </header>

      {/* Tabs (estructura para futuro) */}
      <div className="border-b border-gray-800 px-6">
        <nav className="flex gap-1">
          <button className="px-4 py-2 text-sm border-b-2 border-blue-500 text-blue-400 font-medium">
            USD / CLP
          </button>
          <button className="px-4 py-2 text-sm text-gray-500 cursor-not-allowed" disabled>
            + Instrumento
          </button>
        </nav>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-[calc(100vh-89px)]">

        {/* Columna izquierda: Noticias */}
        <div className="lg:col-span-1 border-r border-gray-800 overflow-y-auto">
          <Suspense fallback={<CargandoPanel texto="Cargando noticias..." />}>
            <PanelNoticias />
          </Suspense>
        </div>

        {/* Columna central: Cotización + Factores */}
        <div className="lg:col-span-1 border-r border-gray-800 overflow-y-auto">
          <Suspense fallback={<CargandoPanel texto="Cargando mercado..." />}>
            <PanelCotizacion />
          </Suspense>
          <Suspense fallback={<CargandoPanel texto="Cargando factores..." />}>
            <PanelFactores />
          </Suspense>
        </div>

        {/* Columna derecha: Agente */}
        <div className="lg:col-span-1 overflow-y-auto">
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
