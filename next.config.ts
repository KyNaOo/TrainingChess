import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site 100 % statique : `next build` produit un export HTML/JS dans `out/`.
  output: "export",
  // Chaque route devient `route/index.html`, servi tel quel par n'importe quel hébergeur statique.
  trailingSlash: true,
  // L'optimisation d'images par défaut nécessite un serveur.
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
