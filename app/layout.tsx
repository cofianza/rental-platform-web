import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Fraunces } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fuentes del rebranding del cliente (entregadas en cofianza_login v1).
// Outfit = sans display para titulares grandes; Fraunces italic = acento
// editorial en frases destacadas (eg. 'Soy yo. Llamanos.').
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["italic"],
});

export const metadata: Metadata = {
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
