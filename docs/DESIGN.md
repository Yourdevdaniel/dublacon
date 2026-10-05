# Design

## Theme

Light mode only, por decisão de produto — sem `prefers-color-scheme: dark`.

## Color

Estratégia mista por superfície: **Committed** (laranja vívido carrega a navbar e os cards de descoberta) sobre uma base **Restrained** (formulários e telas de configuração ficam neutros, laranja só em ações primárias/foco).

Tokens em OKLCH (`frontend/src/index.css`):

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `oklch(100% 0 0)` | branco puro — o calor vem da marca, não do fundo |
| `--surface` / `--surface-2` | `oklch(97.5%/94.5% 0.004/0.008 40)` | painéis, fallback de avatar/capa |
| `--border` | `oklch(89% 0.012 40)` | bordas de card, input, list-row |
| `--ink` | `oklch(22% 0.02 40)` | títulos |
| `--text` / `--text-muted` | `oklch(40%/52% 0.02 40)` | corpo / secundário |
| `--accent` | `oklch(64% 0.19 39)` | laranja de marca — navbar, botão primário, foco |
| `--accent-2` | `oklch(78% 0.15 70)` | dourado — gradiente do fallback de capa |
| `--danger` | `oklch(55% 0.2 25)` | erros |

Contraste checado: `--text` sobre `--bg` e `--accent-ink` sobre `--accent` passam 4.5:1.

## Typography

Uma família só (`system-ui`/Inter fallback), escala fixa em rem (produto, não fluida): h1 1.75rem, h2 1.25rem, h3 1.05rem, corpo 15px/1.5.

## Layout

- **Shell responsivo estilo app social**: topbar laranja full-bleed (`.navbar`, conteúdo centralizado em 1080px) com links de texto + ícones de mensagens/notificações + avatar do usuário no desktop; em ≤680px os links somem e a navegação vira **tab bar fixa embaixo** (`.tabbar`, ícone + label, item ativo em laranja). `main` ganha `padding-bottom` extra no mobile pra tab bar não cobrir conteúdo.
- Z-index semântico: `--z-nav` (topbar e tabbar). Altura da tab bar em `--tabbar-h`.
- `.page-head`: cabeçalho padrão de página (h1 + `.subtitle` à esquerda, ação primária à direita).
- Grid de descoberta: `.project-grid` com `repeat(auto-fit, minmax(240px, 1fr))`, sem breakpoints manuais.
- `.list-row` pra listas simples; `.panel` (fundo `--surface`, radius-md) agrupa seções de formulário (Configurações, criar projeto) pra não parecer formulário corrido.
- Feed centralizado: `.feed-col` (max 600px, margin auto).

## Components

- **Ícones** (`components/ui.jsx`): vocabulário único em stroke 1.8 (compass, feed, claquete, chat, sino, user) usado na navbar, tab bar e empty states.
- **ProjectCard** (`components/ProjectCard.jsx`): capa 4:3 com fallback em gradiente laranja→dourado + claquete; badges sobre a imagem; borda neutra que esquenta pra laranja no hover.
- **Hero do projeto** (`ProjectDetail.css`): título/meta/dono SOBRE a capa com scrim em gradiente escuro (contraste garantido em qualquer imagem); fallback laranja→dourado; full-bleed no mobile.
- **Skeleton** (`.skeleton` + `SkeletonCards`): shimmer por opacidade no lugar de "Carregando..." (grid de descoberta, feed, notificações).
- **Empty** (`components/ui.jsx`): estado vazio centrado com ícone laranja + título + texto acolhedor.
- **Chat**: bolhas assimétricas (`.bubble` / `.bubble--mine` laranja), composer sticky no rodapé (desloca acima da tab bar no mobile).
- **btn-secondary**: ação secundária (recusar, marcar lida, sair) em `--surface-2`.
- **role-chip**: toggle de papel como pill clicável; **auth-card**: card centralizado pra login/registro.
- Todo botão/input/foco compartilha os mesmos tokens — vocabulário único em todas as telas.

## Motion

Transições utilitárias em 150ms (hover de botão/link/card), sem coreografia de entrada de página. `prefers-reduced-motion` zera todas as transições/animações.
