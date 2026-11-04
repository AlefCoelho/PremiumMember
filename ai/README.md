# Memoria operacional

Camada de contexto para IA, nao documentacao para humanos. Leia daqui antes de explorar o
codigo, e atualize apos qualquer mudanca relevante.

| Arquivo | Quando ler |
|---|---|
| `current-focus.md` | sempre, primeiro |
| `architecture.md` | mapa de pastas, rotas, fluxo |
| `backend.md` | banco, server actions, auth |
| `frontend.md` | paginas, componentes, formularios |
| `ui-system.md` | cor, tema, animacao |
| `business-rules.md` | comissao, carencia, acesso |
| `integrations.md` | InfinitePay, rastreio, saques, env |
| `known-issues.md` | antes de deploy ou de mexer em banco |
| `decisions.md` | antes de propor mudanca estrutural |
| `patterns.md` | antes de escrever codigo novo |

Runbook de deploy fica em `DEPLOY.md`, na raiz — nao duplicar aqui.

Por tarefa: UI -> `ui-system` + `frontend`. Backend -> `backend` + `architecture`.
Regra de negocio -> `business-rules`. Bug -> `known-issues`. Fluxo -> `architecture` +
`integrations`.
