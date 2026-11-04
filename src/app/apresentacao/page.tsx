import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarClock,
  Crown,
  GraduationCap,
  HandCoins,
  Heart,
  LifeBuoy,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Premium Member — o ecossistema",
  description:
    "Comunidade, aulas exclusivas, encontros ao vivo e uma central de indicacoes no mesmo lugar.",
};

const pilares = [
  {
    Icon: MessagesSquare,
    titulo: "Comunidade viva",
    texto:
      "Espacos organizados por assunto, publicacoes com reacoes e comentarios, e um feed que mostra o que importa. Sem link de divulgacao: aqui dentro a conversa e entre membros.",
  },
  {
    Icon: GraduationCap,
    titulo: "Aulas exclusivas",
    texto:
      "Trilhas que destravam conforme voce avanca. O conteudo fica guardado no mesmo lugar onde a duvida e respondida, nao espalhado em links soltos.",
  },
  {
    Icon: CalendarClock,
    titulo: "Encontros ao vivo",
    texto:
      "Lives agendadas com presenca confirmada, e a gravacao guardada para quem nao pode estar. Voce entra pelo proprio portal, no horario.",
  },
  {
    Icon: LifeBuoy,
    titulo: "Suporte de gente",
    texto:
      "Um espaco proprio para duvida de painel, link, pagamento e saque. Pergunta feita e pergunta respondida, visivel para quem vier depois.",
  },
  {
    Icon: HandCoins,
    titulo: "Central de indicacoes",
    texto:
      "Seus links, seus cliques, suas vendas liberadas e seus saques, numa secao so. O motor que calcula a comissao e o mesmo desde o primeiro dia.",
  },
  {
    Icon: Users,
    titulo: "Rede que rende",
    texto:
      "Bonus sobre as vendas liberadas de quem voce trouxe. A rede aparece no painel, nome por nome, sem planilha paralela.",
  },
] as const;

const experiencia = [
  {
    Icon: Sparkles,
    titulo: "Tudo num lugar so",
    texto: "Comunidade, aulas, suporte e comissao sem trocar de aba, de login ou de aplicativo.",
  },
  {
    Icon: Heart,
    titulo: "Feito para o celular",
    texto: "Abre como aplicativo, com barra de navegacao na mao e leitura confortavel.",
  },
  {
    Icon: ShieldCheck,
    titulo: "Area fechada de verdade",
    texto: "Conteudo e fotos so abrem para quem esta dentro. Nada fica exposto na internet.",
  },
  {
    Icon: TrendingUp,
    titulo: "Evolui com voce",
    texto: "Espacos novos liberam conforme suas vendas liberadas crescem.",
  },
] as const;

export default function ApresentacaoPage() {
  return (
    <main className="lp">
      <div className="lp-aura" aria-hidden />

      <header className="lp-hero">
        <p className="eyebrow">Premium Member</p>
        <h1>
          Um ecossistema <span className="gold-shine">inteiro</span> para quem leva a serio.
        </h1>
        <p className="lp-hero-texto">
          Comunidade, aulas exclusivas, encontros ao vivo e a sua central de indicacoes — no
          mesmo lugar, com <span className="gold-shine">acesso de membro</span>.
        </p>
        <a className="primary-button lp-cta-topo" href="#acesso">
          <Crown size={16} />
          Quero fazer parte
        </a>
        <p className="lp-rolar" aria-hidden>
          role para conhecer
        </p>
      </header>

      <section className="lp-secao">
        <p className="eyebrow">O que tem dentro</p>
        <h2>
          Seis frentes, <span className="gold-shine">uma plataforma</span>.
        </h2>

        <div className="lp-pilares">
          {pilares.map(({ Icon, titulo, texto }) => (
            <article className="lp-card" key={titulo}>
              <span className="lp-card-icone">
                <Icon size={20} />
              </span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-secao lp-secao-faixa">
        <p className="eyebrow">A experiencia</p>
        <h2>
          Entrar e <span className="gold-shine">facil</span>. Ficar e natural.
        </h2>

        <div className="lp-experiencia">
          {experiencia.map(({ Icon, titulo, texto }) => (
            <div className="lp-exp-item" key={titulo}>
              <span className="lp-exp-icone">
                <Icon size={18} />
              </span>
              <div>
                <strong>{titulo}</strong>
                <p>{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-secao">
        <p className="eyebrow">Como funciona</p>
        <h2>
          Do cadastro ao <span className="gold-shine">primeiro saque</span>.
        </h2>

        <ol className="lp-passos">
          <li>
            <span className="lp-passo-num">1</span>
            <div>
              <strong>Voce entra</strong>
              <p>Cria o acesso em um minuto e ja cai na comunidade, com os espacos abertos.</p>
            </div>
          </li>
          <li>
            <span className="lp-passo-num">2</span>
            <div>
              <strong>Aprende e participa</strong>
              <p>Assiste as aulas, tira duvida no suporte e aparece nos encontros ao vivo.</p>
            </div>
          </li>
          <li>
            <span className="lp-passo-num">3</span>
            <div>
              <strong>Indica com seu link</strong>
              <p>Cada indicacao aparece no painel, com prazo de liberacao visivel.</p>
            </div>
          </li>
          <li>
            <span className="lp-passo-num">4</span>
            <div>
              <strong>Saca o que liberou</strong>
              <p>Comissao liberada vira saldo, e o saque sai por PIX ou carteira.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="lp-secao lp-acesso" id="acesso">
        <div className="lp-oferta">
          <p className="eyebrow">Acesso de membro</p>
          <h2>
            Entre para o <span className="gold-shine">Premium Member</span>.
          </h2>

          <div className="lp-preco">
            <span className="lp-preco-moeda">R$</span>
            <strong>97</strong>
            <span className="lp-preco-periodo">,00 por mes</span>
          </div>

          <ul className="lp-inclui">
            <li>
              <BadgeCheck size={16} /> Comunidade completa, com todos os espacos abertos
            </li>
            <li>
              <BadgeCheck size={16} /> Aulas exclusivas e trilhas que destravam
            </li>
            <li>
              <BadgeCheck size={16} /> Encontros ao vivo, com gravacao guardada
            </li>
            <li>
              <BadgeCheck size={16} /> Suporte direto dentro da plataforma
            </li>
            <li>
              <BadgeCheck size={16} /> Central de indicacoes, comissoes e saques
            </li>
          </ul>

          <Link className="primary-button lp-cta" href="/cadastro-membro">
            <Crown size={18} />
            Adquirir acesso por R$ 97,00 mensal
          </Link>

          <p className="muted lp-nota">
            Ja e membro? <Link href="/socio/login">Entre no portal</Link>.
          </p>
        </div>
      </section>

      <footer className="lp-rodape">
        <p className="muted">Premium Member — comunidade, ensino e indicacoes no mesmo lugar.</p>
      </footer>
    </main>
  );
}
