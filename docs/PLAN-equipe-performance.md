# PLAN: Redesign do Módulo de Performance da Equipe

## 1. Visão Geral
Refatorar a UI do módulo de Performance da Equipe (`/relatorios/equipe`) para seguir estritamente o design system (`.agent/docs/guia-de-estilo/brand.md`), utilizando como principal referência os componentes visuais e a harmonia da tela de Pedido de Compra (`PedidoCompraPageClient.tsx`).

## 2. Padrões de Design a serem aplicados (Base: brand.md)

### 2.1. Cores e Superfícies
- **Fundo da Página**: Remover fundos brancos puros que fujam da estética e garantir suporte a `--brand-bg` (`#FAF3E0`).
- **Cards (Shells)**: Fundo `#ffffff`, borda `--border-shell` (`#e8e1d6`), sombra sutil `shadow-[0_1px_2px_rgba(16,24,40,0.04)]` e `rounded-2xl`.
- **Textos**: O abandono das utility colors padrão (`text-slate-900`, `text-green-600`) em favor da paleta semântica do brand (`#2c201b` como texto primário, `#6f6556` como secundário).
- **Semântica (Positivo/Negativo)**: Para variação financeira ou métricas positivas (Ex: Faturamento, Obras convertidas), utilizar verde escuro (`#2f7a52`).

### 2.2. Tipografia e Estrutura
- **Títulos (h1)**: Fonte Inter, Bold (`700`), cor `--brand-secondary` (`#393316`).
- **Tabelas (UsersPerformanceTable)**:
  - Cabeçalho: Fundo `#faf8f3`, borda inferior `#e7e0d4`, texto `text-[11px] uppercase tracking-[0.08em] font-semibold`.
  - Linhas: Border bottom `#efe8dc`, Hover em `#faf8f4` (padrão) ou `#f3ecdc` (se clicável).
- **Toolbars e Filtros (SmartDateRangePicker)**:
  - Utilizar container `rounded-xl` com padding adequado, combinando com botões fantasma (`ghost muted`) ou secundários do brand.

### 2.3. Gráficos (DailyBudgetsChart)
- Substituir o uso de azuis/verdes brilhantes no gráfico de barras para a cor brand principal `--brand-accent` (`#f5d193`) ou `--brand-secondary` (`#393316`), de modo a manter a consistência visual cremosa/terrosa do sistema.

## 3. Escopo de Alterações e Arquivos

### 3.1. `EquipePerformanceClient.tsx`
- Refatorar a classe raiz container para ajustar o background.
- Substituir os Cards de "Métricas Globais" para obedecer os borders, radii e box-shadow do brand.
- Ajustar os ícones (`Lucide`) para utilizar a cor `--text-muted` (`#7b705f`).

### 3.2. `UsersPerformanceTable.tsx`
- Refatorar completamente a estilização da `<table>`.
- Remover designs padrão das tags ShadCN e aplicar o layout visual visto em `PedidoCompraListTable.tsx`.
- Incluir o efeito de cursor e seleção da `brand.md`.

### 3.3. `DailyBudgetsChart.tsx`
- Modificar as cores no objeto Recharts `<Bar />` para não utilizar a `CSS Variable` padrão, inserindo os hexadeximais designados pela paleta (`#393316` ou `#9b4b1d`).
- Remover eixos escuros fortes, formatando os labels do eixo X e Y com a cor de texto mutado (`#9a8f7c`) e fonte de dados diminuída (11px ou 12px).

### 3.4. `UserTimelineDrawer.tsx`
- Adaptar o Drawer/Sheet para usar as superfícies da paleta, em contraste com fundos genéricos.
- Padronizar os "bullets" (ícones de timeline) para tons pastéis suaves.

## 4. Portão Socrático (Perguntas para o Usuário)

Antes de iniciar o código (`/create` ou modo Edit), por favor esclareça:

1. **Gráfico de Evolução:** No gráfico de orçamento diário, você prefere uma métrica de "Quantidade de Orçamentos" ou de "Valor (Ticket) Total"? Posso usar a paleta terrosa ou dourada (`#f5d193`)?
2. **Timeline Drawer:** Gostaria que o evento aberto lateralmente de histórico exibisse o detalhe completo da ação (ex: quais produtos foram inseridos no orçamento) ou apenas a listagem das atividades do consultor com link redirecionando?
3. **Métricas adicionais:** Há algum KPI não existente atualmente na tabela (Ex: logins no dia, tempo online, etc) que se tornará mandatório nesta repaginada?

## 5. Próximos Passos
- Analisar a resposta do usuário às perguntas acima.
- O usuário deve autorizar a continuação ou usar o comando apropriado (ex: responder as perguntas e dar sinal verde).
- Executar os refactors em `EquipePerformanceClient.tsx` e seus sub-componentes mantendo 100% da lógica e alterando somente a apresentação UI/UX.
