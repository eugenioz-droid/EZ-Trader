import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta EZ Trader
        base: "#0D1117",       // fondo principal charcoal
        panel: "#111827",      // paneles / cards
        elevated: "#1C1C1E",   // hover / tarjetas elevadas (neutral, sin azul)
        line: "#272727",       // bordes suaves (neutral, sin azul)
        brand: "#00FF7F",      // verde neón principal
        brandDark: "#00B26A",  // verde esmeralda
        silver: "#DDE2E6",     // gris plata
        snow: "#F8FAFC",       // texto principal
        muted: "#94A3B8",      // texto secundario
        pesoDebil: "#F6465D",  // USD/CLP sube (peso débil)
        pesoFuerte: "#16C784", // USD/CLP baja (peso fuerte)
      },
    },
  },
  plugins: [],
} satisfies Config;
