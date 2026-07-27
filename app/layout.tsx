import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "HomeWatch | Panel privado de cámaras",
    description: "Una vista privada y protegida de las cámaras del hogar y del estado de grabación del DVR local.",
    openGraph: {
      title: "HomeWatch",
      description: "Cámaras privadas. Visión clara.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Panel de vigilancia nocturna de HomeWatch" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "HomeWatch",
      description: "Cámaras privadas. Visión clara.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
