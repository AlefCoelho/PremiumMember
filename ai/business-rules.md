# Regras do produto

Fonte da verdade: `src/lib/rules.ts` (constantes) + tabela `program_settings` (valores
editaveis em runtime, linha `id = 1`). As constantes sao o **default da semente**; o que
vale em producao e a linha de `program_settings`.

| Regra | Default |
|---|---|
| Valor da assinatura | R$ 31,00 (`SUBSCRIPTION_VALUE_CENTS = 3100`) |
| Comissao por venda | R$ 10,00 (`COMMISSION_PER_SALE_CENTS = 1000`) |
| Carencia | 7 dias (`HOLD_DAYS`) |
| Meta de acesso gratis | 3 vendas (`FREE_ACCESS_SALES_TARGET`) |
| Janela da meta | 30 dias (`FREE_ACCESS_WINDOW_DAYS`) |
| Saque minimo | R$ 30,00 (`MIN_WITHDRAWAL_CENTS = 3000`) |
| Bonus de rede | 20% (`NETWORK_BONUS_PERCENT`) |

## Status de uma indicacao — `getReferralStatus()`

Ordem de avaliacao, nao inverter:

1. tem `refunded_at` ou `cancelled_at` -> `blocked`
2. sem `paid_at` -> `pending`
3. `paid_at + hold_days` ainda no futuro -> `paid`
4. passou a carencia -> `eligible`

So `eligible` conta para saldo e para a meta de 3 vendas.

## Acesso gratis

3 vendas `eligible` dentro dos ultimos 30 dias (`getAccessWindowStart()`) liberam 30 dias
de acesso premium. A janela e deslizante, recontada a cada leitura.

## Politicas declaradas

- Fraude: cliente unico por e-mail/CPF, sem autoindicacao, bloqueio em reembolso ou cancelamento.
- Pagamento: comissao so apos a carencia. Saque manual por PIX ou carteira digital aprovada.

## Comunidade

Acesso a um espaco exige `eligible_sales >= space.min_eligible_sales`
(`getMemberEligibleSales()` / `getSpacesForMember()`). Espaco `archived` nao aparece para
o membro. O gate e aplicado **no servidor**, na consulta, nao na renderizacao.

## Comunidade — comportamentos

**Acesso ao espaco**: `eligible_sales >= space.min_eligible_sales`
(`getMemberEligibleSales()` / `getSpacesForMember()`). Espaco `archived` nao aparece.
O gate e aplicado **no servidor, na consulta**, nao na renderizacao.

**Reacoes**: cinco tipos — `like`, `dislike`, `heart` (Amei), `money`, `sad`. Uma por membro
por publicacao: clicar em outra **troca**, clicar na mesma **remove**.

**Favoritos**: toggle por membro, listados em `/socio/comunidade/favoritos`.

**Link externo**: membro **nao** publica link, nem em publicacao nem em comentario
(`containsExternalLink`). Admin publica.

**Publicacoes em alta**: `community_featured_posts`, marcadas por `toggleFeatured()`.

**Eventos**: o botao de entrar aparece de 10 minutos antes do inicio ate o fim da live, com
15 minutos de folga. Presenca e toggle idempotente (`UNIQUE (event_id, affiliate_id)`).

**Notificacoes**: o autor de uma publicacao e avisado quando alguem **comenta** ou **reage**
nela. Nunca se notifica a si mesmo. Admin nao recebe (nao tem linha em `affiliates`).
Trocar de reacao atualiza a mesma notificacao; **retirar a reacao apaga a notificacao**, para
o sino nao apontar para algo que nao existe mais. Marcar como lidas e explicito, por botao —
nao acontece so por abrir a pagina.

**Redefinicao de senha**: token de 32 bytes guardado como hash SHA-256, valido 60 minutos,
uso unico, e um pedido novo invalida o anterior.
