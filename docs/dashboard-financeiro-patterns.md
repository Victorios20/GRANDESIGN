# Dashboard Financeiro: Padrões de Interação

## Objetivo
- Manter o dashboard como painel de leitura rápida.
- Priorizar clique direto e inspeção sem navegação de página.
- Reduzir copy, CTAs textuais e altura total da tela.

## Padrões
- `Card/item clicável abre detalhe`
  Cards e linhas do dashboard devem abrir detalhe ao clicar na superfície inteira, sem botão textual redundante.

- `Popover compacto para refino leve`
  Usar para filtros secundários como contas e seleções rápidas. Deve ter contexto mínimo, lista curta e ação clara.

- `Expansão inline para detalhe curto`
  Usar quando o detalhe cabe no próprio card sem quebrar o fluxo da página. No dashboard financeiro, esse é o padrão de `Maiores despesas do período`.

- `Bandeja lateral direita para inspeção`
  Usar para abrir contexto adicional sem trocar de tela. É o padrão para período clicado no gráfico, itens da agenda e composição do caixa.

- `Tela dedicada para análise profunda`
  Usar apenas quando o usuário precisa sair da leitura executiva e entrar em exploração completa ou operação detalhada.

## Aplicação no Dashboard
- `Evolução financeira`
  O gráfico é o elemento principal. O detalhe abre na bandeja lateral apenas ao clicar em barra, ponto ou período.

- `Maiores despesas do período`
  A linha da categoria expande inline para mostrar fornecedores. O link para análise completa deve ser discreto.

- `Composição do caixa`
  O card inteiro é clicável e abre a bandeja lateral com contas e movimentações recentes.

- `Pagamentos a vencer` e `Recebimentos previstos`
  Cada item é clicável e abre a bandeja lateral. O cabeçalho pode manter apenas um atalho sutil para a tela completa.

## Regras de Copy
- Evitar texto explicativo que repete contexto já visível no componente.
- Evitar frases como `Período selecionado` quando o seletor já comunica isso.
- Preferir títulos curtos, badges curtos e links discretos.
