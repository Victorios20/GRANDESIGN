# PR: Redesign da Tela de Cadastros e Reorganização da Sidebar

## 🎯 Objetivo
Padronizar a interface do módulo de **Cadastros** para seguir o Design System da aplicação, reorganizar a navegação lateral (**Sidebar**) para melhor usabilidade e corrigir bugs críticos de API e Build.

## 📝 Principais Mudanças

### 🎨 UI/UX (Frontend)
- **Redesign da Página de Cadastros (`/cadastros`):**
  - Substituição de cards antigos por **Tabs** (Fornecedores | Materiais | Componentes).
  - Adoção do `PageLayout` padrão e tabelas consistentes.
  - Navegação intuitiva com breadcrumbs.
- **Melhoria na Sidebar (`src/components/ui/custom-sidebar.tsx`):**
  - Reorganização dos itens em grupos lógicos: **Gerar**, **Gerenciar** e **Configurações**.
  - Ícones e labels atualizados para maior clareza.
- **Usabilidade na Home:**
  - Tabelas de "Últimas Obras" e "Orçamentos" agora possuem **linhas inteiramente clicáveis**.
  - Correção de contraste (hover) nos cards de "Ações Rápidas".

### ⚙️ Backend (API)
- **Fix em Materiais (`/api/materiais`):**
  - Implementada serialização correta para campos `Decimal` do Prisma, resolvendo erro `400 Bad Request` ao listar materiais.

### 🛠️ Correções e Build
- **Build (`src/app/pedidos`):**
  - Correção de erros de TypeScript em dados mock e propriedades de componentes que impediam o `npm run build`.
- **Links:** Varredura completa para garantir integridade da navegação (sem links quebrados).

## 🧪 Como Testar

1. **Navegação:**
   - Verifique se a Sidebar mostra os grupos "Gerar", "Gerenciar" e "Configurações".
2. **Cadastros:**
   - Acesse `/cadastros`.
   - Navegue entre as abas (Fornecedores, Materiais).
   - Tente cadastrar um novo material (deve funcionar sem erro 400).
3. **Home:**
   - Na Home, clique na linha de uma obra recente e verifique o redirecionamento.
4. **Build:**
   - Execute `npm run build` e confirme que finaliza com sucesso (Exit Code 0).

## 📸 Screenshots (Opcional)
*(Adicione screenshots do antes/depois se disponível)*

---
*Gerado via Documentation Writer Agent 🤖*
