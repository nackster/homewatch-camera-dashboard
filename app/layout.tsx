import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "HomeWatch | Private Camera Dashboard",
    description: "A secure, private view of your home cameras and local DVR recording status.",
    openGraph: {
      title: "HomeWatch",
      description: "Private cameras. Clear view.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "HomeWatch Night Watch dashboard" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "HomeWatch",
      description: "Private cameras. Clear view.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
