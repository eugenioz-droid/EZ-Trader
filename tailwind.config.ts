import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta EZ Trader
        base: "#0D1117",       // fondo principal (charcoal)
        panel: "#111827",      // paneles
        elevated: "#1A2336",   // tarjetas / hover
        line: "#1F2A3C",       // bordes suaves
        brand: "#00FF7F",      // acento principal (neón, uso medido)
        brandDark: "#00B26A",  // esmeralda
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
