# Padroes reutilizaveis

## Server action completa

```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

const PATH = "/admin/comunidade";

export async function minhaAction(formData: FormData) {
  await requireAdmin();                      // 1. permissao, sempre primeiro
  const id = requireId(formData, "id");      // 2. validacao por helper
  const nome = requireText(formData, "name", 80);
  requireExistingGroup(id);                  // 3. existencia
  minhaMutacao(id, nome);                    // 4. mutacao em src/lib
  revalidatePath(PATH);                      // 5. revalidar
}
```

Helpers de parse (copiar de `src/app/admin/comunidade/actions.ts`):
`asText`, `requireText(key, maxLength)`, `requireId`, `requireDirection`, `requireKind`,
`asMinEligibleSales`.

## Tabela nova

```ts
db.exec(`
CREATE TABLE IF NOT EXISTS minha_tabela (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_minha_tabela_x ON minha_tabela(coluna, position);
`);
```

Coluna nova em tabela existente: `ensureColumn("tabela", "coluna", "TEXT NOT NULL DEFAULT ''")`.

## Slug unico

`slugify(value)` em `src/lib/community.ts`: deriva do nome, e se colidir acrescenta sufixo
numerico. Gerado **so na criacao**, nunca no rename.

## Reordenar

`moveGroup(id, "up"|"down")` / `moveSpace(id, "up"|"down")` trocam `position` com o vizinho.
No formulario: `<input type="hidden" name="direction" value="up">`.

## Arquivar em vez de excluir

`status = 'archived'` esconde da leitura do membro e preserva o historico.
Exclusao real existe so para espaco (`deleteSpace`) e pede confirmacao na UI.

## Cartao com editor inline

```tsx
<article className="card">
  <header>…</header>
  <details>
    <summary>Editar</summary>
    <form action={minhaAction}>
      <input type="hidden" name="id" value={item.id} />
      …
    </form>
  </details>
</article>
```

## Formatar dinheiro

Sempre por `src/lib/money.ts`. Nunca `toFixed(2)` espalhado.
