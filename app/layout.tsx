import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";
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
};

export const viewport: Viewport = {
  themeColor: "#C2410C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn" className={`${display.variable} ${body.variable}`}>
      <body>
        <InAppBrowserNotice />
        {children}
      </body>
    </html>
  );
}
