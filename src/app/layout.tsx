import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { person } from "@/lib/content";
import "./globals.css";

/** Headings, navigation, statements and body copy. */
const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

/** Labels, indexes, timestamps and system readouts only. */
const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
  display: "swap",
});

const description =
  "Taha Koulal - Applied AI Engineer building agentic systems, digitising business workflows and delivering products with coding agents.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Taha Koulal - Applied AI Engineer",
  description,
  authors: [{ name: person.name }],
  openGraph: {
    title: "Taha Koulal — Agentic Systems & Product Development",
    description,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Taha Koulal" }],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0b",
  colorScheme: "dark",
};

/* Runs before first paint so reveal states never flash visible→hidden. */
const bootScript = `document.documentElement.classList.add('js')`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${space.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      {/* Extensions (password managers, colour pickers) add attributes to body before hydration. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
