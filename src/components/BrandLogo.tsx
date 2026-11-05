/**
 * A marca do Premium Member.
 *
 * SVG embutido, nao <img src="/logo.svg">: a saida standalone serve estaticos de
 * uma pasta propria e um arquivo esquecido na copia viraria 404 silencioso — a
 * mesma pegadinha que ja deixou o site inteiro sem CSS num deploy. Embutido, a
 * marca vai junto do HTML e nao tem como faltar.
 *
 * `legenda` desligada deixa so o selo, para quando a lateral esta estreita.
 */
export function BrandLogo({
  titulo = "Premium Member",
  legenda,
  tamanho = 40,
}: {
  titulo?: string;
  legenda?: string;
  tamanho?: number;
}) {
  return (
    <span className="brand-logo">
      <span className="brand-logo-mark" style={{ width: tamanho, height: tamanho }}>
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="brandLogoGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffeaa0" />
              <stop offset="0.55" stopColor="#e3bb55" />
              <stop offset="1" stopColor="#c8992f" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="14" fill="#0a0a0c" />
          <rect
            x="1.5"
            y="1.5"
            width="61"
            height="61"
            rx="12.5"
            fill="none"
            stroke="#2b2c35"
            strokeWidth="1.5"
          />
          <path d="M32 11 52 32 32 53 12 32Z" fill="url(#brandLogoGold)" />
          <path d="M32 20.5 43.5 32 32 43.5 20.5 32Z" fill="#0a0a0c" opacity="0.88" />
          <path d="M32 26.5 37.5 32 32 37.5 26.5 32Z" fill="url(#brandLogoGold)" />
        </svg>
      </span>
      <span className="brand-logo-text">
        <strong>{titulo}</strong>
        {legenda ? <span>{legenda}</span> : null}
      </span>
    </span>
  );
}
