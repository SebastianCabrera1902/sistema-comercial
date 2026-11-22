import type { NextConfig } from "next";

// Usamos el modelo de renderizado dinámico clásico: todas las páginas leen la
// sesión (cookie) en cada pedido, así que no tiene sentido prerenderizarlas.
const nextConfig: NextConfig = {
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
