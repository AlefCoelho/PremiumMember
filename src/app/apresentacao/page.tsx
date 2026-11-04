import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Bot,
  CalendarClock,
  Clock,
  Crown,
  Download,
  GraduationCap,
  HandCoins,
  Heart,
  LifeBuoy,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  Users,
  Workflow,
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

const arsenal = [
  {
    Icon: Download,
    titulo: "Agentes prontos para baixar",
    texto:
      "Nada de montar do zero. Voce acessa, baixa e usa — ja configurado, ja testado, pronto para trabalhar no primeiro minuto.",
  },
  {
    Icon: Workflow,
    titulo: "Workflows que ja rodam",
    texto:
      "Fluxos completos para negocio pequeno e para operacao grande. O que muda e a escala, nao o trabalho de montar.",
  },
  {
    Icon: Terminal,
    titulo: "Automacoes para Claude Code e Codex",
    texto:
      "Feitas sob medida para as ferramentas que voce ja usa. Chega pronto, encaixa, roda.",
  },
  {
    Icon: Bot,
    titulo: "Um agente para cada necessidade",
    texto:
      "Vendas, suporte, conteudo, financeiro, operacao, pesquisa. Precisa de algo especifico? Tem um agente para isso.",
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
          Um arsenal de <span className="gold-shine">agentes de IA prontos para usar</span>,
          mais comunidade, aulas, encontros ao vivo e a sua central de indicacoes — tudo no
          mesmo lugar.
        </p>
        <a className="primary-button lp-cta-topo" href="#acesso">
          <Crown size={16} />
          Quero fazer parte
        </a>
        <p className="lp-rolar" aria-hidden>
          role para conhecer
        </p>
      </header>

      <section className="lp-secao lp-arsenal" id="arsenal">
        <p className="eyebrow">O diferencial</p>
        <h2>
          Um time inteiro de agentes, <span className="gold-shine">pronto para baixar</span>.
        </h2>
        <p className="lp-secao-texto">
          Pare um segundo e faca a conta. Quanto tempo leva para montar um time que cobre
          vendas, suporte, conteudo, financeiro e operacao? Quanto custa manter esse time?
        </p>
        <p className="lp-secao-texto">
          Aqui dentro ele ja existe, montado e configurado. Sao{" "}
          <span className="gold-shine">funcionarios que trabalham 24 horas por dia</span>, sete
          dias por semana, sem ferias, sem atraso e sem curva de aprendizado. Voce baixa e
          comeca a usar.
        </p>

        <div className="lp-arsenal-grid">
          {arsenal.map(({ Icon, titulo, texto }) => (
            <article className="lp-card lp-card-destaque" key={titulo}>
              <span className="lp-card-icone">
                <Icon size={20} />
              </span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>

        <div className="lp-conta">
          <span className="lp-conta-icone">
            <Clock size={20} />
          </span>
          <div>
            <strong>A conta que ninguem faz</strong>
            <p>
              Montar, testar e ajustar um unico agente bom leva dias. Um time inteiro leva
              meses — e isso se voce souber exatamente o que esta fazendo. O que esta aqui
              dentro ja passou por esse caminho.{" "}
              <span className="gold-shine">Voce pula a parte dificil</span> e fica com o
              resultado.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-secao">
        <p className="eyebrow">O que mais tem dentro</p>
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
              <BadgeCheck size={16} /> Arsenal de agentes de IA prontos para baixar e usar
            </li>
            <li>
              <BadgeCheck size={16} /> Workflows e automacoes para Claude Code e Codex
            </li>
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

          {/* Pagamento fica fora do sistema por enquanto: a InfinitePay do app
              esta desligada, entao o botao leva direto para a fatura. */}
          <a
            className="primary-button lp-cta"
            href="https://invoice.infinitepay.io/plans/gabriela-42644709-4v3/AAZSyC2MYW"
            target="_blank"
            rel="noreferrer"
          >
            <Crown size={18} />
            Adquirir acesso por R$ 97,00 mensal
          </a>

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
