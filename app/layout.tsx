import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Fraunces } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { SITIO_URL } from "@/lib/sitio";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Solo la usa el panel: sin precarga, las páginas públicas no la descargan.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

// Fuentes del rebranding del cliente (entregadas en cofianza_login v1).
// Outfit = sans display para titulares grandes; Fraunces italic = acento
// editorial en frases destacadas (eg. 'Soy yo. Llamanos.').
// Ambas son variables: sin `weight` se descarga un solo archivo con todo el
// eje de peso, en vez de uno por peso.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Solo la usa la landing (font-script): sin precarga, las demás páginas no la
// descargan.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["italic"],
  preload: false,
});

export const metadata: Metadata = {
  // B9: las URLs de og:image (p. ej. /autorizar) salen absolutas al dominio
  // canónico, no al de Vercel ni al de la vista previa.
  metadataBase: new URL(SITIO_URL),
  title: "Cofianza",
  description: "Plataforma de gestión de arrendamientos en Colombia",
  keywords: "arrendamiento, inmuebles, propiedades, colombia, gestión",
  authors: [{ name: "INXENIUX" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CO">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${fraunces.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
