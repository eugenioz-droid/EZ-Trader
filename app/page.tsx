export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">EZ Trader</h1>
        <p className="mt-4 text-lg text-gray-400">
          Análisis de noticias y factores para trading USD/CLP
        </p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-gray-700 px-4 py-2 text-sm text-gray-400">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          Setup inicial funcionando
        </div>
      </div>
    </main>
  );
}
