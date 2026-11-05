"use client";

import { Bell, GraduationCap, CalendarClock, LayoutGrid, MessageSquare, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const iconePorTipo = {
  aula: GraduationCap,
  modulo: GraduationCap,
  espaco: LayoutGrid,
  evento: CalendarClock,
} as const;

export type BellItem = {
  id: number;
  kind: string;
  title: string;
  detail: string;
  href: string;
  created_at: string;
  nova: boolean;
};

function quando(valor: string) {
  const data = new Date(`${valor.replace(" ", "T")}Z`);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * O sino fixo no canto direito.
 *
 * Fica fora do fluxo da pagina de proposito: o membro precisa saber que tem
 * novidade esteja ele no feed, numa aula ou no perfil, e um item de menu so
 * avisa quem esta olhando o menu.
 *
 * A marcacao e um ponto, nao um numero: o pedido era sinalizar que existe algo
 * novo, e um contador grande no canto da tela vira cobranca. O numero exato
 * continua na pagina de notificacoes.
 */
export function NotificationBell({
  novidades,
  naoLidas,
}: {
  novidades: BellItem[];
  naoLidas: number;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  const novas = novidades.filter((item) => item.nova).length;
  const temAlgo = novas + naoLidas > 0;

  useEffect(() => {
    if (!aberto) return;

    const foraDaCaixa = (evento: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(evento.target as Node)) setAberto(false);
    };
    const comEsc = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
    };

    document.addEventListener("mousedown", foraDaCaixa);
    document.addEventListener("keydown", comEsc);
    return () => {
      document.removeEventListener("mousedown", foraDaCaixa);
      document.removeEventListener("keydown", comEsc);
    };
  }, [aberto]);

  return (
    <div className="bell" ref={caixa}>
      <button
        className={temAlgo ? "bell-button com-novidade" : "bell-button"}
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-label={temAlgo ? "Novidades na plataforma" : "Notificacoes"}
        aria-expanded={aberto}
      >
        <Bell size={18} />
        {temAlgo ? <span className="bell-dot" aria-hidden="true" /> : null}
      </button>

      {/* O painel fecha no clique dele mesmo, e nao num efeito que observa a
          rota: todo item aqui e um link, e o clique nele ja e o sinal de que o
          painel cumpriu a funcao. Observar a rota custava um render extra a
          cada navegacao da area de membro. */}
      {aberto ? (
        <div
          className="bell-panel"
          role="dialog"
          aria-label="Novidades"
          onClick={() => setAberto(false)}
        >
          <header>
            <strong>Novidades</strong>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar">
              <X size={15} />
            </button>
          </header>

          {novidades.length ? (
            <ul>
              {novidades.slice(0, 6).map((item) => {
                const Icone = iconePorTipo[item.kind as keyof typeof iconePorTipo] ?? MessageSquare;
                const conteudo = (
                  <>
                    <span className="bell-item-icon">
                      <Icone size={15} />
                    </span>
                    <span className="bell-item-body">
                      <strong>{item.title}</strong>
                      {item.detail ? <span>{item.detail}</span> : null}
                    </span>
                    <span className="bell-item-when">{quando(item.created_at)}</span>
                  </>
                );

                return (
                  <li className={item.nova ? "nova" : undefined} key={item.id}>
                    {item.href ? (
                      <Link href={item.href}>{conteudo}</Link>
                    ) : (
                      <span className="bell-item-plain">{conteudo}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Nada novo publicado ainda.</p>
          )}

          <Link className="bell-panel-footer" href="/socio/comunidade/notificacoes">
            Ver todas as notificacoes
            {naoLidas > 0 ? <em>{naoLidas > 99 ? "99+" : naoLidas}</em> : null}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
