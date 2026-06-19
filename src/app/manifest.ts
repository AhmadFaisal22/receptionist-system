import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SEG Solar visitor log",
    short_name: "SEG Visitor",
    description: "Digital visitor log for SEG Solar Manufaktur Indonesia",
    // Land on the public menu, not an auth-protected route — launching the
    // installed app on /dashboard redirected to /login and flashed the screen.
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f1f5f9",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
