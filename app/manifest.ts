import type { MetadataRoute } from "next";

/** Web app manifest for install-to-home-screen (PWA). Icons use the generated `/icon` route. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SanaFathima Mansion",
    short_name: "SFM Expenses",
    description: "Shared expense tracking for roommates",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8fafc",
    theme_color: "#6366f1",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
