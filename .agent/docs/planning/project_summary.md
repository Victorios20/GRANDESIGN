i# Resumo do Produto: Módulo Financeiro

## Objetivo do módulo
Transformar o financeiro do GRANDESIGN em uma base confiável para operar o dia a dia da empresa e das obras, sem depender de controles paralelos.

Em termos práticos, o módulo precisa permitir:

1. Operar contas a pagar e contas a receber de ponta a ponta.
2. Conciliar o realizado com os saldos bancários.
3. Enxergar fluxo de caixa com rapidez e confiança.
4. Comparar orçado x realizado por obra.
5. Medir o resultado operacional do mês do negócio.

## Leitura simples do estado atual

O projeto já passou da fase de ideia. Existe base real de módulo financeiro no produto, com:

- contas bancárias;
- categorias financeiras;
- centros de custo;
- lançamentos;
- contas a pagar;
- contas a receber;
- relatórios de fluxo de caixa;
- relatório de orçado x realizado;
- relatório de resultado operacional.

O principal problema agora não é "criar o financeiro do zero". O problema é consolidar o que já existe para que a operação seja confiável, clara e fechada.

## Diagnóstico por missão

| Missão | Estado atual | Leitura de produto |
| --- | --- | --- |
| Contas a pagar e receber | Base implementada com telas, listagens e ações financeiras | Precisa homologação de ponta a ponta e regras operacionais claras para edição, baixa parcial, reprogramação e exclusão |
| Conciliação bancária | Existe marcação de lançamentos conciliados | Ainda depende de disciplina operacional; a confiabilidade dos saldos precisa ser mantida por rotina clara de conferência |
| Fluxo de caixa | Existe visão projetada por período e centro de custo | A tela existe, mas a confiança depende da qualidade dos lançamentos, vencimentos e saldos bancários |
| Orçado x realizado das obras | Existe relatório usando financeiro como fonte do realizado | Precisa governança sobre baseline, extras e classificação correta dos lançamentos por centro de custo/categoria |
| Resultado operacional do mês | Existe relatório mensal com receitas, despesas, resultado e margem | Precisa definição funcional explícita do que entra ou não entra no resultado para evitar leitura ambígua |

## Definições de produto

### 1. O que significa "execução plena" de contas a pagar e receber

O módulo atende a missão quando o time consegue:

- cadastrar títulos de pagamento e recebimento;
- parcelar quando necessário;
- baixar valores totais ou parciais;
- acompanhar vencidos, pendentes e liquidados;
- vincular a categoria, conta bancária e centro de custo corretos;
- corrigir erros operacionais sem quebrar o histórico;
- fechar o dia sem depender de planilha paralela.

### 2. O que significa "conciliação bancária"

Para este produto, conciliação bancária significa:

- cada lançamento financeiro relevante estar refletido na conta bancária correta;
- o saldo atual da conta ser compatível com saldo inicial + receitas - despesas;
- o operador conseguir distinguir o que já foi conciliado do que ainda está pendente de conferência;
- transferências entre contas não distorcerem o caixa consolidado.

### 3. O que significa "fluxo de caixa confiável"

O fluxo de caixa é confiável quando:

- mostra o saldo atual correto;
- projeta entradas e saídas com base em títulos pendentes reais;
- permite leitura por período e por centro de custo;
- sinaliza risco com antecedência suficiente para decisão;
- não depende de lançamentos duplicados ou mal classificados.

### 4. O que significa "orçado x realizado das obras"

Esse relatório deve responder, para cada obra:

- quanto foi previsto vender;
- quanto foi previsto gastar;
- quanto já foi realizado de fato;
- onde houve estouro ou economia;
- qual é a margem real da obra.

### 5. O que significa "resultado operacional do mês"

Esse indicador deve responder:

- quanto a empresa faturou no mês;
- quanto consumiu em custos e despesas operacionais;
- qual foi o resultado do período;
- qual foi a margem operacional;
- como esse mês se compara ao anterior.

## Decisões funcionais que passam a valer como referência

- O financeiro deve ter o `lancamento` como fonte principal do realizado.
- Conta a pagar e conta a receber representam obrigação e direito; o caixa só muda quando existe baixa/recebimento.
- Centro de custo é obrigatório para leitura gerencial por obra, mesmo quando a operação permitir exceções.
- Fluxo de caixa e resultado operacional não podem depender de interpretação manual do usuário final.
- Relatório gerencial sem regra explícita é risco de produto, não detalhe técnico.

## Lacunas prioritárias

### P0

- Fechar a rotina operacional de contas a pagar e receber com regras de edição, baixa parcial, reabertura e exclusão.
- Garantir consistência de saldo bancário após importações, ajustes e transferências.
- Deixar explícito o critério de composição do resultado operacional mensal.

### P1

- Padronizar processo de conciliação para o operador financeiro.
- Padronizar classificação financeira por categoria e centro de custo.
- Reduzir ambiguidades no orçado x realizado, especialmente em extras e baseline.

### P2

- Evoluir conciliação para processo mais assistido.
- Expandir relatórios executivos e visão histórica comparativa.

## Critério de sucesso

O módulo financeiro será considerado maduro quando:

- o time operar pagamentos e recebimentos sem controles paralelos;
- o saldo das contas bancárias fechar com os lançamentos;
- o fluxo de caixa for confiável para decisão de curto prazo;
- o gestor de obras confiar no orçado x realizado;
- a direção usar o resultado operacional mensal como indicador do negócio.
