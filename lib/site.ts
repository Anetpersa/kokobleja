// Javna adresa aplikacije (za linkove u previewu i kalendaru)
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kokobleja.vercel.app";

export function eventUrl(id: string) {
  return `${SITE_URL}/eventi/${id}`;
}
