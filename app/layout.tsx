import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const display = Baloo_2({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});
const body = Nunito({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Kokobleja",
  description: "Eventi naše ekipe",
  // Privatna grupa: ne želimo da nas Google indeksira (Viber preview i dalje radi)
  robots: { index: false, follow: false },
  applicationName: "Kokobleja",
  // iPhone: instalirana aplikacija (Dodaj na početni ekran) se otvara preko celog ekrana
  appleWebApp: { capable: true, title: "Kokobleja", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#C2410C",
  // da donji meni na iPhone-u ne upadne ispod crte za povratak na početni ekran
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn" className={`${display.variable} ${body.variable}`}>
      <body>
        <ServiceWorkerRegister />
        <InAppBrowserNotice />
        {children}
      </body>
    </html>
  );
}
