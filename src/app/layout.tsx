import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Premium Member",
  description: "Comunidade, aulas e central de afiliados do Premium Member.",
  appleWebApp: {
    capable: true,
    title: "Premium Member",
    statusBarStyle: "black-translucent",
  },
};

// `viewportFit: "cover"` deixa o conteudo ir ate a borda no iPhone; o CSS da
// comunidade usa env(safe-area-inset-bottom) para a barra de baixo nao cair
// sob o indicador de gestos. `themeColor` pinta a barra do navegador no tom do
// fundo, que e o que faz a tela parecer um app e nao uma pagina.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
