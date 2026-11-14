import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getEventPreview } from "@/lib/preview";
import { longDate, timeOnly } from "@/lib/time";

// Slika koju Viber prikazuje uz link eventa: samo naziv i datum
export const alt = "Event u Kokobleji";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fontovi su podeljeni na osnovna slova i "latin-ext" (č, ć, ž, š, đ), pa za svaki dajemo oba dela
async function font(file: string) {
  return readFile(join(process.cwd(), "assets/fonts", file));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventPreview(id);

  const title = event?.title ?? "Kokobleja";
  const when = event ? `${longDate(event.starts_at)} · ${timeOnly(event.starts_at)}` : "Eventi naše ekipe";
  const titleSize = title.length > 60 ? 64 : title.length > 32 ? 80 : 100;

  const [baloo, balooExt, nunito, nunitoExt] = await Promise.all([
    font("baloo-2-latin-800-normal.woff"),
    font("baloo-2-latin-ext-800-normal.woff"),
    font("nunito-latin-800-normal.woff"),
    font("nunito-latin-ext-800-normal.woff"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          background: "#FFF7ED", padding: "64px 72px", fontFamily: "Nunito, Nunito Ext", color: "#2B1B12",
          borderLeft: "28px solid #C2410C",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 34 34">
            <path d="M17 3c6.5 0 11.5 9 11.5 16.5a11.5 11.5 0 0 1-23 0C5.5 12 10.5 3 17 3z" fill="#EA580C" />
            <circle cx="20.5" cy="15" r="1.9" fill="#2B1B12" />
            <path d="M26.5 17.5l4.5 1.6-4.5 1.6z" fill="#F59E0B" />
            <path d="M13 5.5c0-2 2-3 3-1.5c1-1.5 3.2-0.8 3 1.2" stroke="#B91C1C" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "Baloo 2, Baloo 2 Ext", fontSize: 44, color: "#9A3412" }}>Kokobleja</span>
          {event?.cancelled && (
            <span
              style={{
                marginLeft: "auto", background: "#B91C1C", color: "#fff", fontSize: 34,
                padding: "8px 24px", borderRadius: 999, letterSpacing: 2,
              }}
            >
              OTKAZANO
            </span>
          )}
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "Baloo 2, Baloo 2 Ext", fontSize: titleSize, lineHeight: 1.05,
              color: event?.cancelled ? "#8a7466" : "#2B1B12",
              textDecoration: event?.cancelled ? "line-through" : "none",
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span style={{ fontSize: 48, color: "#C2410C" }}>{when}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Baloo 2", data: baloo, weight: 800, style: "normal" },
        { name: "Baloo 2 Ext", data: balooExt, weight: 800, style: "normal" },
        { name: "Nunito", data: nunito, weight: 800, style: "normal" },
        { name: "Nunito Ext", data: nunitoExt, weight: 800, style: "normal" },
      ],
    },
  );
}
