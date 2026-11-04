# Decisoes arquiteturais

| Decisao | Motivo |
|---|---|
| SQLite em arquivo, sem servidor de banco | um unico processo, operacao simples, backup = copiar arquivo |
| Sem ORM e sem ferramenta de migracao | schema criado por `CREATE TABLE IF NOT EXISTS` no import + `ensureColumn()`; deploy nunca precisa de passo de migracao |
| Nunca alterar tabela antiga, so criar nova | rollback = voltar o codigo; os dados novos ficam parados sem atrapalhar |
| Server components + server actions, quase zero cliente | menos JS, validacao obrigatoriamente no servidor |
| Duas sessoes separadas (admin e membro) | cookies e guardas distintos; vazamento de uma nao abre a outra |
| Dinheiro em centavos inteiros | sem float |
| Datas como texto ISO | comparacao lexicografica funciona no SQLite |
| Tema escuro unico, paleta em `:root` | decidido em 2026-11-04; nao ha tema claro |
| Slug imutavel apos criacao | URL divulgada nao quebra ao renomear |
| Reordenar por botoes `up`/`down`, nao drag-and-drop | funciona sem JS, cabe em server action |
| Comissao liberada so por webhook, nunca pela pagina de retorno | a pagina de retorno e do cliente e nao e confiavel |
| `order_nsu` unico como chave de idempotencia | reentrega de webhook nao duplica comissao |
| Admin da comunidade gerencia estrutura, nao conteudo | Alef cria grupos/espacos sem SQL; posts seguem sendo dos membros |
