# Corrigir pagamento parcial

## Objetivo

Garantir que uma conta a pagar com saldo zerado fique como paga e permitir ajustar o valor total durante uma baixa menor que o saldo.

## Implementacao

- Centralizar a derivacao do status financeiro a partir de valor total e valor pago.
- Recalcular o status ao editar o valor total da conta.
- Exibir confirmacao antes de uma baixa parcial.
- Processar o ajuste de valor e o pagamento na mesma transacao.
- Manter a sincronizacao financeira do pedido de compra.

## Validacao

- Conta parcial cujo total passa a ser igual ao pago fica paga.
- Baixa menor sem ajuste permanece parcial.
- Baixa menor com ajuste altera o total e fica paga.
- Valor total menor que o valor ja pago e rejeitado.
