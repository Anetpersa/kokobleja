import type { MetadataRoute } from "next";

// Opis aplikacije za instalaciju na telefon (Android čita ovo, iPhone delimično)
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Kokobleja",
    short_name: "Kokobleja",
    description: "Eventi naše ekipe",
    lang: "sr-Latn",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF7ED",
    theme_color: "#C2410C",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Dugo držanje ikonice na Androidu nudi prečicu
    shortcuts: [
      {
        name: "Novi event",
        short_name: "Novi event",
        url: "/eventi/novi",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
