import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-corpo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "RaioX Brasília — dossiê público de políticos",
    template: "%s — RaioX Brasília",
  },
  description:
    "Busque qualquer candidato ou político brasileiro e veja candidatura, votação, processo e apoio formal num só lugar, com fonte em cada informação.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>
        <div className="textura-scan" aria-hidden="true" />
        <header className="cabecalho">
          <Link href="/" className="cabecalho__marca">
            <svg viewBox="0 0 64 64" className="cabecalho__selo" aria-hidden="true">
              <rect width="64" height="64" rx="12" fill="#0a1f14" />
              <polygon points="32,8 58,32 32,56 6,32" fill="#f0b429" />
              <circle cx="32" cy="32" r="12" fill="#1c3f94" />
              <path
                d="M 21 32 A 11 11 0 0 1 43 28"
                stroke="#f5f3ec"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <span className="cabecalho__texto">
              Raio<em>X</em> Brasília
            </span>
          </Link>
          <span className="cabecalho__tagline">dossiê público · fonte aberta</span>
        </header>
        <main className="conteudo">{children}</main>
        <footer className="rodape-site">
          <span>
            Dado público, fonte oficial em cada informação. Nenhum dado apagado — só
            oculto quando exigido por ordem judicial.
          </span>
        </footer>
      </body>
    </html>
  );
}
