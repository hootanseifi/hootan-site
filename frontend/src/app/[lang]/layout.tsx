import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/caveat";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource-variable/vazirmatn";
import "../globals.css";
import { dirOf, hasLocale, locales } from "@/i18n";

const description =
  "AI Engineer portfolio: interview my digital twin, score a job ad, and try to beat my team of seven AI trading agents.";

/** Title, description and the link preview card (Open Graph) that LinkedIn and messengers show. */
export const metadata: Metadata = {
  metadataBase: new URL("https://hootanseifi.pro"),
  title: "Hootan Seifi",
  description,
  openGraph: {
    type: "website",
    siteName: "Hootan Seifi",
    title: "Hootan Seifi | AI Engineer",
    description,
    images: [{ url: "/assets/og.jpg", width: 1200, height: 630, alt: "Hootan Seifi, AI Engineer" }],
  },
  twitter: { card: "summary_large_image" },
};

const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html lang={lang} dir={dirOf(lang)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen overflow-x-hidden antialiased">{children}</body>
    </html>
  );
}
