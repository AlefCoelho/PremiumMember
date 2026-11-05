import {
  GraduationCap,
  ArrowDown,
  ArrowUp,
  Archive,
  ArchiveRestore,
  CalendarClock,
  Clock,
  LayoutDashboard,
  KeyRound,
  Lock,
  LogOut,
  MessagesSquare,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import {
  createCommunityGroupAction,
  createCommunitySpaceAction,
  deleteCommunitySpaceAction,
  grantSpaceAccessAction,
  moveCommunityGroupAction,
  moveCommunitySpaceAction,
  renameCommunityGroupAction,
  revokeSpaceAccessAction,
  setCommunityGroupPositionAction,
  setCommunityGroupStatusAction,
  setCommunitySpaceStatusAction,
  setGroupAccessAction,
  setSpaceAccessAction,
  updateCommunitySpaceAction,
} from "@/app/admin/comunidade/actions";
import { BrandLogo } from "@/components/BrandLogo";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminCommunityTree,
  getSpaceGrants,
  spaceKinds,
  type AccessRule,
  type AccessScope,
  type AdminCommunityGroup,
  type AdminCommunitySpace,
} from "@/lib/community";

const okMessages: Record<string, string> = {
  "grupo-criado": "Grupo criado.",
  "grupo-salvo": "Grupo atualizado.",
  "grupo-arquivado": "Grupo arquivado. Ele e os espacos dele sairam da lateral do membro.",
  "grupo-reativado": "Grupo reativado.",
  "espaco-criado": "Espaco criado e ja visivel na lateral do membro.",
  "espaco-salvo": "Espaco atualizado.",
  "espaco-arquivado": "Espaco arquivado.",
  "espaco-reativado": "Espaco reativado.",
  "espaco-excluido": "Espaco excluido junto com as publicacoes dele.",
  "grupo-movido": "Grupo movido. A lateral do membro ja esta na ordem nova.",
  "acesso-salvo": "Regra de acesso salva.",
  "acesso-liberado": "Membro liberado neste espaco.",
  "acesso-retirado": "Acesso do membro retirado.",
};

function resumoDaRegra(rule: AccessRule) {
  const partes: string[] = [];
  if (rule.locked) partes.push(`Premium${rule.price_label ? ` - ${rule.price_label}` : ""}`);
  if (rule.release_at) partes.push(`Abre em ${rule.release_at.replace(" ", " as ")}`);
  if (rule.release_days) partes.push(`${rule.release_days} dia(s) apos a entrada do membro`);
  return partes;
}

/**
 * O formulario de acesso, igual para grupo e espaco.
 *
 * As duas regras ficam no mesmo envio porque sao a mesma decisao tomada de
 * duas maneiras — "quem entra" e "quando entra" — e um admin que abre este
 * painel costuma mexer nas duas de uma vez.
 */
function AccessPanel({
  scope,
  targetId,
  rule,
}: {
  scope: AccessScope;
  targetId: number;
  rule: AccessRule;
}) {
  const action = scope === "group" ? setGroupAccessAction : setSpaceAccessAction;
  const idField = scope === "group" ? "group_id" : "space_id";
  const alvo = scope === "group" ? "grupo" : "espaco";

  return (
    <form action={action} className="stack access-form">
      <input type="hidden" name={idField} value={targetId} />

      <div className="access-form-block">
        <strong>
          <Lock size={14} />
          Travar como Premium
        </strong>
        <p className="muted">
          O {alvo} continua aparecendo na lateral do membro, marcado, e em vez de abrir leva ao seu
          link de pagamento. Depois que a pessoa pagar, libere ela na lista abaixo.
        </p>
        <label className="access-check">
          <input type="checkbox" name="locked" value="1" defaultChecked={rule.locked === 1} />
          <span>Exigir pagamento para abrir este {alvo}</span>
        </label>
        <label>
          Link de pagamento
          <input
            name="checkout_url"
            type="url"
            defaultValue={rule.checkout_url}
            placeholder="https://..."
            maxLength={300}
          />
        </label>
        <div className="split-fields">
          <label>
            Preco (so o texto do botao)
            <input
              name="price_label"
              defaultValue={rule.price_label}
              placeholder="Ex.: R$ 97/mes"
              maxLength={60}
            />
          </label>
        </div>
        <label>
          Chamada da tela de bloqueio
          <textarea
            name="pitch"
            rows={2}
            defaultValue={rule.pitch}
            placeholder="O que o membro ganha ao liberar este conteudo"
            maxLength={400}
          />
        </label>
      </div>

      <div className="access-form-block">
        <strong>
          <Clock size={14} />
          Liberacao programada
        </strong>
        <p className="muted">
          Data fixa abre para todos ao mesmo tempo. Dias apos a entrada abre na conta de cada
          membro, para gotejar o conteudo de quem entrou agora. Com as duas preenchidas, vale a que
          cair mais tarde. Deixe vazio e zero para liberar na hora.
        </p>
        <div className="split-fields">
          <label>
            Abrir em (data e hora)
            <input
              name="release_at"
              type="datetime-local"
              defaultValue={rule.release_at ? rule.release_at.replace(" ", "T") : ""}
            />
          </label>
          <label>
            Ou X dias apos a entrada
            <input name="release_days" type="number" min={0} defaultValue={rule.release_days} />
          </label>
        </div>
      </div>

      <button className="primary-button" type="submit">
        Salvar acesso do {alvo}
      </button>
    </form>
  );
}

function kindLabel(kind: string) {
  return spaceKinds.find((item) => item.value === kind)?.label ?? kind;
}

function MoveButtons({
  action,
  idField,
  id,
  disableUp,
  disableDown,
}: {
  action: (formData: FormData) => Promise<void>;
  idField: string;
  id: number;
  disableUp: boolean;
  disableDown: boolean;
}) {
  return (
    <div className="row-actions">
      <form action={action}>
        <input type="hidden" name={idField} value={id} />
        <input type="hidden" name="direction" value="up" />
        <button className="icon-button" type="submit" title="Subir" disabled={disableUp}>
          <ArrowUp size={14} />
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name={idField} value={id} />
        <input type="hidden" name="direction" value="down" />
        <button className="icon-button" type="submit" title="Descer" disabled={disableDown}>
          <ArrowDown size={14} />
        </button>
      </form>
    </div>
  );
}

function SpaceItem({
  space,
  groups,
  isFirst,
  isLast,
}: {
  space: AdminCommunitySpace;
  groups: AdminCommunityGroup[];
  isFirst: boolean;
  isLast: boolean;
}) {
  const archived = space.status !== "active";
  const regra = resumoDaRegra(space.rule);
  const liberados = getSpaceGrants(space.id);

  return (
    <li className={archived ? "community-admin-space archived" : "community-admin-space"}>
      <div className="community-admin-space-head">
        <div>
          <strong>{space.name}</strong>
          <div className="community-admin-meta">
            <span className={archived ? "badge neutral" : "badge success"}>
              {archived ? "Arquivado" : "Ativo"}
            </span>
            <span>{kindLabel(space.kind)}</span>
            <span>
              {space.min_eligible_sales
                ? `A partir de ${space.min_eligible_sales} venda(s) liberada(s)`
                : "Todos os membros"}
            </span>
            <span>{space.post_count} publicacao(oes)</span>
            <span className="mono-value">/socio/comunidade/{space.slug}</span>
            {regra.map((texto) => (
              <span className="badge warning" key={texto}>
                {texto}
              </span>
            ))}
            {space.grant_count ? <span>{space.grant_count} membro(s) liberado(s)</span> : null}
          </div>
          {space.description ? <p>{space.description}</p> : null}
        </div>
        <MoveButtons
          action={moveCommunitySpaceAction}
          idField="space_id"
          id={space.id}
          disableUp={isFirst}
          disableDown={isLast}
        />
      </div>

      <details className="community-admin-editor">
        <summary>Editar espaco</summary>
        <div className="community-admin-editor-body">
          <form action={updateCommunitySpaceAction} className="stack">
            <input type="hidden" name="space_id" value={space.id} />
            <div className="split-fields">
              <label>
                Nome
                <input name="name" defaultValue={space.name} maxLength={80} required />
              </label>
              <label>
                Emoji
                <input name="emoji" defaultValue={space.emoji} maxLength={8} placeholder="Ex.: 📍" />
              </label>
            </div>
            <label>
              Descricao
              <input name="description" defaultValue={space.description} maxLength={400} />
            </label>
            <label>
              Grupo
              <select name="group_id" defaultValue={String(space.group_id)}>
                {groups.map((group) => (
                  <option value={group.id} key={group.id}>
                    {group.name}
                    {group.status === "active" ? "" : " (arquivado)"}
                  </option>
                ))}
              </select>
            </label>
            <div className="split-fields">
              <label>
                Tipo
                <select name="kind" defaultValue={space.kind}>
                  {spaceKinds.map((kind) => (
                    <option value={kind.value} key={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Vendas liberadas minimas
                <input
                  name="min_eligible_sales"
                  type="number"
                  min={0}
                  defaultValue={space.min_eligible_sales}
                />
              </label>
            </div>
            <p className="muted">
              O endereco /socio/comunidade/{space.slug} nao muda ao renomear, para nao quebrar links ja
              divulgados.
            </p>
            <button className="primary-button" type="submit">
              Salvar espaco
            </button>
          </form>

          <form action={setCommunitySpaceStatusAction} className="stack">
            <input type="hidden" name="space_id" value={space.id} />
            <input type="hidden" name="status" value={archived ? "active" : "archived"} />
            <button className="outline-button" type="submit">
              {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {archived ? "Reativar espaco" : "Arquivar espaco"}
            </button>
          </form>

          <form action={deleteCommunitySpaceAction} className="stack community-admin-danger">
            <input type="hidden" name="space_id" value={space.id} />
            <p className="muted">
              Excluir apaga o espaco <strong>e as {space.post_count} publicacao(oes)</strong> dele, com os
              comentarios, sem como desfazer. Prefira arquivar. Para confirmar, digite EXCLUIR.
            </p>
            <label>
              Confirmacao
              <input name="confirm" placeholder="EXCLUIR" />
            </label>
            <button className="danger-button" type="submit">
              <Trash2 size={14} />
              Excluir espaco e publicacoes
            </button>
          </form>
        </div>
      </details>

      <details className="community-admin-editor">
        <summary>Acesso e liberacao</summary>
        <div className="community-admin-editor-body">
          <AccessPanel scope="space" targetId={space.id} rule={space.rule} />

          <div className="access-grants">
            <strong>
              <UserPlus size={14} />
              Membros liberados neste espaco
            </strong>
            <p className="muted">
              O link de pagamento e externo, entao quem confirma o pagamento e voce. Liberado aqui, o
              membro entra mesmo com o espaco travado e sem esperar a data.
            </p>

            <form action={grantSpaceAccessAction} className="stack">
              <input type="hidden" name="space_id" value={space.id} />
              <div className="split-fields">
                <label>
                  E-mail do membro
                  <input name="email" type="email" placeholder="email@exemplo.com" required />
                </label>
                <label>
                  Nota (opcional)
                  <input name="note" placeholder="Ex.: pago via PIX 05/11" maxLength={160} />
                </label>
              </div>
              <button className="outline-button" type="submit">
                Liberar membro
              </button>
            </form>

            {liberados.length ? (
              <ul className="access-grant-list">
                {liberados.map((item) => (
                  <li key={item.affiliate_id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span className="muted">
                        {item.email}
                        {item.note ? ` - ${item.note}` : ""}
                      </span>
                    </div>
                    <form action={revokeSpaceAccessAction}>
                      <input type="hidden" name="space_id" value={space.id} />
                      <input type="hidden" name="affiliate_id" value={item.affiliate_id} />
                      <button className="icon-button" type="submit" title="Retirar acesso">
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nenhum membro liberado manualmente ainda.</p>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}

function GroupPanel({
  group,
  groups,
  isFirst,
  isLast,
  ordem,
  total,
}: {
  group: AdminCommunityGroup;
  groups: AdminCommunityGroup[];
  isFirst: boolean;
  isLast: boolean;
  ordem: number;
  total: number;
}) {
  const archived = group.status !== "active";
  const regra = resumoDaRegra(group.rule);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>
            {group.name} {archived ? <span className="badge neutral">Arquivado</span> : null}
          </h2>
          <p>{group.spaces.length} espaco(s). A ordem aqui e a ordem da lateral em /socio/comunidade.</p>
          {regra.length ? (
            <div className="community-admin-meta">
              {regra.map((texto) => (
                <span className="badge warning" key={texto}>
                  {texto}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="group-order">
          {/* Mandar o grupo direto para uma posicao. As setas continuam ali
              para o ajuste de um degrau, mas mover o ultimo grupo para o topo
              por setas exige um redirect inteiro a cada clique. */}
          <form action={setCommunityGroupPositionAction} className="group-order-form">
            <input type="hidden" name="group_id" value={group.id} />
            <label>
              Posicao
              <select name="position" defaultValue={String(ordem)}>
                {Array.from({ length: total }, (_, index) => index + 1).map((numero) => (
                  <option value={numero} key={numero}>
                    {numero}º
                  </option>
                ))}
              </select>
            </label>
            <button className="outline-button" type="submit">
              Mover
            </button>
          </form>
          <MoveButtons
            action={moveCommunityGroupAction}
            idField="group_id"
            id={group.id}
            disableUp={isFirst}
            disableDown={isLast}
          />
        </div>
      </div>

      {group.spaces.length ? (
        <ul className="community-admin-list">
          {group.spaces.map((space, index) => (
            <SpaceItem
              space={space}
              groups={groups}
              isFirst={index === 0}
              isLast={index === group.spaces.length - 1}
              key={space.id}
            />
          ))}
        </ul>
      ) : (
        <p className="muted">Nenhum espaco neste grupo ainda.</p>
      )}

      <details className="community-admin-editor">
        <summary>Editar grupo</summary>
        <div className="community-admin-editor-body">
          <form action={renameCommunityGroupAction} className="stack">
            <input type="hidden" name="group_id" value={group.id} />
            <label>
              Nome do grupo
              <input name="name" defaultValue={group.name} maxLength={80} required />
            </label>
            <button className="primary-button" type="submit">
              Salvar grupo
            </button>
          </form>
          <form action={setCommunityGroupStatusAction} className="stack">
            <input type="hidden" name="group_id" value={group.id} />
            <input type="hidden" name="status" value={archived ? "active" : "archived"} />
            <button className="outline-button" type="submit">
              {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {archived ? "Reativar grupo" : "Arquivar grupo e esconder os espacos"}
            </button>
          </form>
        </div>
      </details>

      <details className="community-admin-editor">
        <summary>Acesso e liberacao do grupo</summary>
        <div className="community-admin-editor-body">
          <p className="muted">
            O que estiver aqui vale para <strong>todos os espacos deste grupo</strong>. Um espaco
            pode ser mais restrito que o grupo, nunca menos: entre a data do grupo e a do espaco,
            vale a mais tarde.
          </p>
          <AccessPanel scope="group" targetId={group.id} rule={group.rule} />
        </div>
      </details>
    </section>
  );
}

export default async function AdminCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  await requireAdmin();
  const { ok } = await searchParams;
  const groups = getAdminCommunityTree();
  const activeGroups = groups.filter((group) => group.status === "active");
  const spaceCount = groups.reduce((total, group) => total + group.spaces.length, 0);
  const feedback = ok ? okMessages[ok] : undefined;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <BrandLogo legenda="Comunidade" />

        <nav>
          <Link href="/">
            <LayoutDashboard size={18} />
            Painel de membros
          </Link>
          <a className="active" href="#grupos">
            <MessagesSquare size={18} />
            Grupos e espacos
          </a>
          <Link href="/admin/aulas">
            <GraduationCap size={18} />
            Aulas
          </Link>
          <Link href="/admin/eventos">
            <CalendarClock size={18} />
            Eventos
          </Link>
          <Link href="/admin/senhas">
            <KeyRound size={18} />
            Senhas
          </Link>
        </nav>

        <form action={logoutAction} className="logout-form">
          <button type="submit">
            <LogOut size={18} />
            Sair
          </button>
        </form>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Comunidade</h1>
            <p>
              {groups.length} grupo(s) e {spaceCount} espaco(s). Tudo que estiver ativo aqui aparece na
              lateral do portal do membro, sem precisar de deploy.
            </p>
          </div>
        </header>

        {feedback ? (
          <section className="panel">
            <p className="muted">{feedback}</p>
          </section>
        ) : null}

        <section className="main-grid">
          <div className="primary-column" id="grupos">
            {groups.length ? (
              groups.map((group, index) => (
                <GroupPanel
                  group={group}
                  groups={groups}
                  isFirst={index === 0}
                  isLast={index === groups.length - 1}
                  ordem={index + 1}
                  total={groups.length}
                  key={group.id}
                />
              ))
            ) : (
              <section className="panel">
                <p className="muted">Nenhum grupo criado ainda. Comece criando um ao lado.</p>
              </section>
            )}
          </div>

          <aside className="side-column">
            <section className="panel form-panel">
              <div className="panel-header">
                <h2>Novo grupo</h2>
                <Plus size={18} />
              </div>
              <form action={createCommunityGroupAction} className="stack">
                <label>
                  Nome
                  <input name="name" placeholder="Ex.: Projetos" maxLength={80} required />
                </label>
                <p className="muted">O endereco do grupo e gerado a partir do nome.</p>
                <button className="primary-button" type="submit">
                  Criar grupo
                </button>
              </form>
            </section>

            <section className="panel form-panel">
              <div className="panel-header">
                <h2>Novo espaco</h2>
                <Plus size={18} />
              </div>
              {activeGroups.length ? (
                <form action={createCommunitySpaceAction} className="stack">
                  <label>
                    Grupo
                    <select name="group_id" defaultValue={String(activeGroups[0].id)}>
                      {activeGroups.map((group) => (
                        <option value={group.id} key={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nome
                    <input name="name" placeholder="Ex.: Lancamentos" maxLength={80} required />
                  </label>
                  <label>
                    Descricao
                    <input name="description" placeholder="Para que serve este espaco" maxLength={400} />
                  </label>
                  <div className="split-fields">
                    <label>
                      Tipo
                      <select name="kind" defaultValue="posts">
                        {spaceKinds.map((kind) => (
                          <option value={kind.value} key={kind.value}>
                            {kind.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Vendas liberadas minimas
                      <input name="min_eligible_sales" type="number" min={0} defaultValue={0} />
                    </label>
                  </div>
                  <p className="muted">
                    Com 0, todos os membros veem o espaco. Acima disso, so quem tiver essa quantidade de
                    vendas liberadas.
                  </p>
                  <button className="primary-button" type="submit">
                    Criar espaco
                  </button>
                </form>
              ) : (
                <p className="muted">Crie um grupo ativo antes de criar um espaco.</p>
              )}
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
