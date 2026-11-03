import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { I18nProvider } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n-dictionaries";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxa — L'IA qui te fait réviser à voix haute",
  description:
    "Importe ton cours. Voxa t'interroge à l'oral, écoute ta réponse, corrige tes lacunes et te fait répéter jusqu'à la maîtrise parfaite.",
};

export const viewport: Viewport = {
  themeColor: "#030303",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const lang: Lang = store.get("voxa_lang")?.value === "en" ? "en" : "fr";
  return (
    <html lang={lang} className="dark">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%238b5cf6'/%3E%3Cstop offset='1' stop-color='%2322d3ee'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='9' fill='%2307070c'/%3E%3Crect x='13' y='6' width='6' height='13' rx='3' fill='url(%23g)'/%3E%3Cpath d='M9 15a7 7 0 0 0 14 0v-1h-2.4v1a4.6 4.6 0 0 1-9.2 0v-1H9z' fill='url(%23g)'/%3E%3C/svg%3E"
        />
      </head>
      <body className="min-h-dvh bg-ink font-sans text-zinc-100 antialiased grain">
        <I18nProvider initialLang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
