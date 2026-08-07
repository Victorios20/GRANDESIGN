# Alinhamento visual do Criador de Propostas

## Overview

Atualizar a interface de `/orcamento/new` e `/orcamento/edit/[id]` para a mesma linguagem visual aprovada em Pedidos de Compra e Contas a Pagar, sem alterar cálculos, payloads, persistência ou geração de slide/PDF.

## Project Type

- WEB — Next.js 15, React 18, TypeScript, Tailwind CSS 4 e componentes Radix/Shadcn.
- Agente principal: `frontend-specialist`.
- Fora de escopo: API, Prisma, banco de dados e regras comerciais do orçamento.

## Success Criteria

- Criação e edição usam paleta, tipografia, controles, bordas, sombras e ações do design system atual.
- As quatro etapas têm hierarquia e progresso coerentes, com uma ação primária clara por contexto.
- Tabelas, links e dialogs funcionam em desktop e mobile sem overflow ou controles cortados.
- Calcular, salvar rascunho, salvar cópia, gerar proposta e abrir/copiar links mantêm o comportamento atual.
- Não permanecem referências visuais legadas (`bg-bege`, `text-marromEscuro`, `bg-cinza`) no fluxo atualizado.

## Tech Stack

- Reutilizar `PageLayout`, componentes de `src/components/ui` e tokens de `src/app/globals.css`.
- Extrair apenas wrappers visuais reutilizáveis para `src/components/ds`; nenhuma nova dependência.
- Referência de composição: `src/app/pedido_compra/_components/PedidoCompraForm.tsx` e `src/components/ui/operational-list-styles.ts`.

## File Structure

- `src/components/ds/FormSectionCard.tsx` — shell genérico para seções de formulário.
- `src/components/ds/index.ts` — export público do novo shell.
- `src/app/orcamento/_components/OrcamentoPage.tsx` — cabeçalho, etapas, materiais, resumo e geração.
- `src/app/orcamento/_components/DadosPessoaisCard.tsx` — controles e ações da primeira etapa.
- `src/components/modals/ModalSucessoProposta.tsx` — dialog responsivo de sucesso.

## Task Breakdown

- [ ] `T1` Criar a base visual reutilizável
  - Agent/skills: `frontend-specialist` — `frontend-design`, `tailwind-patterns`, `clean-code`.
  - Priority/dependencies: P0; nenhuma.
  - Input → Output: recipe operacional e `PedidoCompraSectionCard` → `FormSectionCard` baseado em tokens oficiais, sem dependência do domínio de pedidos.
  - Verify: componente aceita título, descrição, ícone, ações e conteúdo; export disponível em `@/components/ds`.

- [ ] `T2` Reorganizar cabeçalho e progressão do orçamento
  - Agent/skills: `frontend-specialist` — `frontend-design`, `nextjs-react-expert`.
  - Priority/dependencies: P1; depende de `T1`.
  - Input → Output: cabeçalho duplicado e progresso de três partes → cabeçalho compacto, quatro etapas coerentes e ações responsivas.
  - Verify: criação e edição exibem título/contexto corretos; `Salvar`, `Salvar cópia` e `Limpar` não colidem em 320px.

- [ ] `T3` Padronizar dados pessoais, observações e parâmetros
  - Agent/skills: `frontend-specialist` — `frontend-design`, `tailwind-patterns`.
  - Priority/dependencies: P1; depende de `T1`.
  - Input → Output: inputs mistos e cores legadas → labels, campos, busca de cliente, selects e textarea no padrão operacional.
  - Verify: busca e seleção de cliente continuam funcionando; foco, erro, disabled e teclado permanecem visíveis e utilizáveis.

- [ ] `T4` Redesenhar materiais e tabelas sem alterar cálculos
  - Agent/skills: `frontend-specialist` — `frontend-design`, `clean-code`.
  - Priority/dependencies: P1; depende de `T1` e `T3`.
  - Input → Output: três tabelas com cabeçalhos legados → shell, cabeçalhos, linhas, edição e ações alinhados ao design system.
  - Verify: calcular e adicionar/editar/remover itens em Madeiras, Materiais Gerais e Telhas produz os mesmos totais; scroll horizontal funciona no mobile.

- [ ] `T5` Refinar resumo, margem e geração da proposta
  - Agent/skills: `frontend-specialist` — `frontend-design`, `web-design-guidelines`.
  - Priority/dependencies: P1; depende de `T4`.
  - Input → Output: cards aninhados e CTAs concorrentes → resumo plano, estados semânticos e bloco de geração com ação primária clara.
  - Verify: ocultar/resetar totais, gerar proposta e abrir/copiar slide/PDF continuam funcionais e responsivos.

- [ ] `T6` Padronizar dialogs e estados de feedback
  - Agent/skills: `frontend-specialist` — `frontend-design`, `web-design-guidelines`.
  - Priority/dependencies: P1; depende de `T2` e `T5`.
  - Input → Output: modal manual e sucesso legado → dialogs Radix com foco, Escape, loading, disabled e layout mobile.
  - Verify: confirmação de título respeita os quatro modos atuais; sucesso permite Home, slide e novo orçamento por mouse e teclado.

## Phase X: Verification

- [ ] Rodar `npx tsc --noEmit` e `npm run build`.
- [ ] Rodar `python .agent/skills/frontend-design/scripts/ux_audit.py src/app/orcamento`.
- [ ] Rodar `python .agent/skills/frontend-design/scripts/accessibility_checker.py src/app/orcamento`.
- [ ] Rodar `python .agent/scripts/checklist.py .` e registrar qualquer falha preexistente separadamente.
- [ ] Validar manualmente criação e edição em desktop e mobile: cliente, cálculo, materiais, totais, rascunho, cópia, geração e links.
- [ ] Confirmar que não houve mudança em rotas de API, schema Prisma ou payloads do orçamento.

## Risks

- O componente principal concentra UI e regras; a alteração deve ser visual e incremental para evitar regressões de cálculo.
- Componentes compartilhados não devem receber mudanças globais que alterem telas fora de Orçamento.
- A barra de progresso precisa representar prontidão do fluxo sem bloquear usos hoje permitidos.

## Done When

- [ ] Todos os critérios visuais e funcionais acima foram verificados.
- [ ] O criador de propostas parece parte do mesmo produto que Pedidos de Compra/Contas a Pagar.
- [ ] Phase X concluída sem regressões novas.
