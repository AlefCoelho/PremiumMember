import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  // Sem isto, o Next infere a raiz a partir do lockfile mais alto que encontrar. Na VPS
  // existe um /package-lock.json, e a saida standalone vinha aninhada em
  // .next/standalone/home/user/htdocs/... em vez de ter server.js na raiz, quebrando o
  // ExecStart do systemd. Fixar a raiz no projeto deixa o build igual em qualquer maquina.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
