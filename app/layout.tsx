import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EZ Trader",
  description: "Análisis de noticias y factores para trading USD/CLP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
