# Sistema visual

Tema **escuro e unico** — a paleta vive em `:root` de `src/app/globals.css`, sem
`prefers-color-scheme` nem `data-theme`. Nao ha tema claro; nao reintroduza um sem pedido.

## Tokens

```
--bg #0a0a0c            --panel #141418         --panel-strong #1d1d23
--text #f3f4f6          --muted #9aa3b2         --border #2b2c35
--blue #3b82f6 / --blue-soft #16233f
--green #4ade80 / --green-soft #12301f
--amber #fbbf24 / --amber-soft #33270a
--red #f87171 / --red-soft #35171a
--sidebar-bg #050507    --sidebar-text #e5e7eb
--gold #c8992f          --gold-bright #ffeaa0
--shadow 0 16px 42px rgba(0,0,0,.5)
```

**Nunca escreva cor cravada em componente.** Se falta um tom, adicione token em `:root`.

## Dourado

`--gold`/`--gold-bright` sao a marca premium. Usados em:
- marca "PORTAL PREMIUM MEMBER" no login do membro — brilho percorrendo, 3.8s
- trecho "E muito mais Alem" da chamada — `eyebrow-shine`

O dourado e **acento**, aplicado a um trecho curto, nunca a um paragrafo inteiro.

## Animacao

Keyframes em `globals.css`: `aura-spin`, `aura-angle-spin`, `aura-button-glow`,
`aura-spin-reverse`, `aura-breathe`, `eyebrow-shine`.

O halo do cartao de login sao 3 camadas com duracoes primas entre si
(dourada 13s, azul/violeta 19s, menta 23s) para o padrao nunca repetir, animando
`scale`, `position`, `blur` e `hue`, com inspiracao rapida e expiracao lenta.
A mesma aura gira na borda do botao de entrar.

**Toda animacao decorativa tem bloco `@media (prefers-reduced-motion: reduce)`.**
Sao 3 hoje; ao adicionar uma quarta, adicione a guarda junto.

## Texto

Sem acentos nas strings de UI e nos comentarios do codigo — convencao do projeto inteiro,
mantida por consistencia.
