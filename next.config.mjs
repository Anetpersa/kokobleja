/** @type {import('next').NextConfig} */
const nextConfig = {
  // Naslov i sliku za preview linka uvek stavljamo u <head>, odmah u prvom odgovoru.
  // Viberov robot ne čeka da se stranica "dostrimuje", pa bi inače video prazan preview.
  htmlLimitedBots: /.*/,
  // Fontovi za sliku u previewu moraju da odu na Vercel zajedno sa kodom
  outputFileTracingIncludes: {
    "/eventi/[id]/opengraph-image": ["./assets/fonts/**"],
  },
};

export default nextConfig;
