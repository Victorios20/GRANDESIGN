# Plano de Produto: Consolidação do Financeiro

## Goal
Fazer o módulo financeiro sair do estágio de "funciona em boa parte" para o estágio de "pode sustentar a operação do negócio com confiança".

## Tasks

- [ ] `T1` Homologar contas a pagar e receber de ponta a ponta
  Verify: cadastrar, editar, parcelar, baixar parcialmente, baixar totalmente, reprogramar vencimento e excluir sem quebrar histórico ou saldo.

- [ ] `T2` Formalizar a regra de conciliação bancária
  Verify: o operador consegue identificar o que está conciliado, o que está pendente e fechar saldo por conta sem interpretação ambígua.

- [ ] `T3` Garantir integridade dos saldos bancários
  Verify: para cada conta, `saldo_inicial + receitas - despesas = saldo_atual`, inclusive após importações, transferências e ajustes.

- [ ] `T4` Tornar o fluxo de caixa uma visão executiva confiável
  Verify: o relatório responde saldo atual, entradas previstas, saídas previstas e risco do período com base em dados reais e sem duplicidade.

- [ ] `T5` Fechar a governança do orçado x realizado das obras
  Verify: cada obra possui leitura clara de receita orçada, custo orçado, custo realizado, desvios e margem, com origem do realizado documentada.

- [ ] `T6` Definir a regra oficial do resultado operacional do mês
  Verify: existe definição explícita do que entra e do que fica fora do relatório, e a leitura mensal é consistente para gestão.

- [ ] `T7` Padronizar cadastros mestres do financeiro
  Verify: contas bancárias, categorias e centros de custo possuem regras claras de uso, ativação/desativação e impacto histórico.

- [ ] `T8` Fechar documentação funcional e operacional
  Verify: existe documento simples para direção/produto e documento objetivo para operação financeira.

## Prioridade

### MUST

- T1 Homologar contas a pagar e receber.
- T2 Formalizar conciliação bancária.
- T3 Garantir integridade dos saldos bancários.
- T4 Tornar o fluxo de caixa confiável.
- T6 Definir a regra oficial do resultado operacional.

### SHOULD

- T5 Fechar governança do orçado x realizado.
- T7 Padronizar cadastros mestres.

### COULD

- T8 Expandir documentação operacional em formato de playbook.

## Done When

- [ ] O financeiro diário roda sem planilha paralela.
- [ ] O saldo bancário confere com os lançamentos.
- [ ] O fluxo de caixa apoia decisão de curto prazo.
- [ ] O orçado x realizado é utilizável pelos gestores de obra.
- [ ] O resultado operacional mensal é aceito como indicador da empresa.
