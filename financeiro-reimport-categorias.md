# Reimportação Financeira 2026 + Categorias Financeiras

## Goal
Reimportar os lançamentos financeiros de 2026 a partir do CSV `Página26`, eliminar a divergência de saldo atual por conta bancária e entregar uma tela administrativa para cadastro de categorias financeiras no mesmo padrão de `Contas Bancárias` e `Centros de Custo`.

## Contexto Atual
- O importador existente está em [scripts/import-financial-history-2026.ts](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/scripts/import-financial-history-2026.ts) e o `DEFAULT_CSV_PATH` ainda aponta para `Página25` em [scripts/import-financial-history-2026.mapping.ts](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/scripts/import-financial-history-2026.mapping.ts).
- O projeto já possui CRUD backend de categorias em [src/app/api/financeiro/categories/route.ts](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/src/app/api/financeiro/categories/route.ts), [src/actions/financeiro/categories/create-category.ts](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/src/actions/financeiro/categories/create-category.ts) e [src/actions/financeiro/categories/update-category.ts](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/src/actions/financeiro/categories/update-category.ts), mas não há tela dedicada em `src/app/configuracoes`.
- O saldo de contas bancárias é mantido incrementalmente em lançamentos/importações e recalculado apenas quando o saldo inicial é alterado, em [src/actions/financeiro/banks/update-bank.ts](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/src/actions/financeiro/banks/update-bank.ts).
- A navegação administrativa já expõe `Contas Bancárias` e `Centros de Custo` em [src/components/ui/sidebar-navigation.ts](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/src/components/ui/sidebar-navigation.ts).

## Premissas
- O reprocessamento deve ser seguro para ambiente já populado, sem duplicar lançamentos nem inflar `saldo_atual`.
- A nova tela de categorias ficará em `Configurações`, com acesso restrito a `ADMIN` e `DEV`.
- A hierarquia permitida continuará em 2 níveis: categoria pai + subcategoria.

## Tasks
- [ ] `T1` Diagnóstico da divergência de saldo
  Agent: `debugger` + `backend-specialist`
  Input: importador atual, CSV `Página26`, regra de saldo em contas bancárias.
  Output: causa documentada da divergência entre `saldo_atual` persistido e saldo esperado por soma de lançamentos.
  Verify: script SQL ou checagem Prisma que compare, por conta, `saldo_inicial + receitas - despesas` vs `saldo_atual`.

- [ ] `T2` Ajustar estratégia de reimportação idempotente
  Agent: `backend-specialist`
  Input: [scripts/import-financial-history-2026.ts](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/scripts/import-financial-history-2026.ts), [scripts/cleanup-financial-test-data.ts](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/scripts/cleanup-financial-test-data.ts), CSV `Página26`.
  Output: fluxo definido para reprocessar com segurança, incluindo atualização do path default, limpeza seletiva do namespace da importação e proteção contra duplicidade.
  Verify: dry-run consistente, `blockedRows` conhecidos, e novo apply sem duplicar `lancamentos`, `contas_pagar`, `contas_receber` ou `transferencias`.

- [ ] `T3` Introduzir reconciliação/rebuild de saldo bancário
  Agent: `backend-specialist`
  Input: regra atual de atualização incremental e necessidade de correção pós-importação.
  Output: rotina reutilizável para recalcular `saldo_atual` a partir de `saldo_inicial` e lançamentos efetivos por conta, usada no fechamento da importação e reaproveitável em manutenção.
  Verify: após reimportar, cada conta fecha exatamente com o saldo esperado; conferência manual nas contas `Inter empresa`, `Inter pessoal` e `Caixinha`.

- [ ] `T4` Completar contratos de categorias para UI administrativa
  Agent: `backend-specialist`
  Input: schema e CRUD existentes de categorias.
  Output: payloads serializados para a UI incluírem tudo que a tela precisa: `id`, `nome`, `tipo`, `cor`, `icone`, `ativo`, `categoria_pai_id`, `subcategorias`, contadores de uso quando necessário e restrições claras de desativação.
  Verify: `GET /api/financeiro/categories` e `GET /api/financeiro/categories?format=flat` retornam dados suficientes para listagem, formulário e ações.

- [ ] `T5` Criar tela de categorias financeiras
  Agent: `frontend-specialist`
  Input: padrões de [src/app/configuracoes/contas-bancarias/_components/BankAccountsPageClient.tsx](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/src/app/configuracoes/contas-bancarias/_components/BankAccountsPageClient.tsx) e [src/app/configuracoes/centros-custo/_components/CostCentersPageClient.tsx](/c:/Users/kbrit/Documents/GitHub/GRANDESIGN/src/app/configuracoes/centros-custo/_components/CostCentersPageClient.tsx).
  Output: nova página em `src/app/configuracoes/categorias-financeiras` com listagem, filtros, criação, edição, ativação/desativação e visualização hierárquica pai/subcategoria.
  Verify: fluxo completo de criar categoria pai, criar subcategoria, editar cor/ícone e desativar categoria sem filhos ativos.

- [ ] `T6` Integrar navegação e permissões
  Agent: `frontend-specialist`
  Input: sidebar e política já aplicada às telas financeiras administrativas.
  Output: item novo em `Configurações` apontando para a tela de categorias, com a mesma regra de acesso de contas bancárias/centros de custo.
  Verify: usuário `ADMIN/DEV` vê a rota; perfis sem permissão são redirecionados para `/sem-acesso`.

- [ ] `T7` Validar importação e superfície administrativa
  Agent: `test-engineer`
  Input: importador atualizado, nova rotina de saldo, nova tela e endpoints.
  Output: checklist objetivo de validação manual/técnica da reimportação e do CRUD de categorias.
  Verify: executar `python .agent/scripts/checklist.py .`, rodar checagens Prisma se houver mudança de schema, e validar manualmente importação + tela.

## Sequência Recomendada
1. Fechar a causa do saldo divergente.
2. Ajustar o pipeline de reimportação com `Página26`.
3. Recalcular saldos bancários ao final da carga.
4. Expor contrato backend completo para categorias.
5. Implementar a tela administrativa.
6. Integrar a navegação.
7. Executar checklist e conferência pós-importação.

## Riscos
- Reexecutar a importação sem limpar o namespace de idempotência pode impedir reprocesso parcial e mascarar divergências.
- Ajustar somente o `saldo_inicial` sem rebuild dos lançamentos mantém inconsistência histórica em `saldo_atual`.
- Desativar categoria com uso em `lancamentos`, `contas_pagar` ou `contas_receber` exige regra explícita de UX e backend.
- O CSV `Página26` contém linhas sem subcategoria; essas linhas precisam continuar bloqueadas ou receber mapeamento antes do apply.

## Done When
- [ ] Importação de `Página26` executa em dry-run e apply sem duplicidade.
- [ ] `saldo_atual` de cada conta bancária bate com o saldo calculado pelos lançamentos.
- [ ] Existe tela em `Configurações` para gerenciar categorias financeiras.
- [ ] Navegação e permissões estão consistentes com os demais cadastros financeiros.
- [ ] Checklist final executado e pendências documentadas.

## Questões em Aberto
- A tela deve permitir editar o `tipo` da categoria após criação ou isso ficará bloqueado para preservar integridade histórica?
- Categorias inativas devem continuar aparecendo em filtros/listagens operacionais quando já estiverem associadas a lançamentos antigos?
