# Project Intake Summary

## 1. Stack & Structure
- **Framework**: Next.js 15.3.3 (App Router likely utilized).
- **Language**: TypeScript.
- **Database / ORM**: PostgreSQL / Prisma 6.19.0.
- **Styling**: Tailwind CSS v4 + `shadcn/ui` (New York style, Lucide icons).
- **Authentication**: NextAuth.js v4 (Credentials Provider, RBAC with Roles).
- **State/Forms**: React Hook Form + Zod.
- **Date Handling**: `date-fns`.

## 2. Domain Entities (Existing)
- **Obra**: Core entity. Links to Cliente, Equipe, Orçamento.
- **Orcamento**: Detailed quotes with materials, stages.
- **PedidoCompra**: Procurement tracking (Telha, Madeira, etc.).
- **User/Role**: RBAC system (UserRole many-to-many).
- **Financial Hints**:
    - `Orcamento` has totals and "payment methods".
    - `Obra` has `pagamento_entrada` and `pagamento_quitacao`.
    - `PedidoCompra` has `valor_orcado` vs `valor_realizado`.

## 3. Gap Analysis (vs PRD)
The current system tracks *operational* costs (estimates vs realized in generic fields) but lacks a legitimate **Double-Entry Financial System**.

| Feature | Current State | PRD Requirement | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Ledger** | Non-existent. Values scattered in columns. | Central `lancamentos` table. | 🔴 High |
| **Banking** | No bank account concepts. | Manage multiple accounts/wallets. | 🔴 High |
| **Cost Centers** | Implicit (Obra ID). | Explicit `centros_custo` entity. | 🟡 Medium |
| **Payables** | `pedido_compra` acts as rough payable. | Dedicated `contas_pagar` with installments. | 🔴 High |
| **Receivables**| `obra.pagamento_...` columns. | Dedicated `contas_receber` with installms. | 🔴 High |
| **Categories** | Hardcoded enums (Types). | Hierarchical `categorias` table. | 🟡 Medium |

## 4. Risks & Conflicts
1.  **Data Migration**: Existing `obras` have payment data in columns. These must be migrated to `contas_receber` transactions eventually, or kept as "legacy" read-only.
2.  **Synchronization**: `PedidoCompra` creates a financial obligation. If the user edits the `PedidoCompra`, the `ContaPagar` must update (unless it's already paid).
3.  **Timezone**: System uses `America/Sao_Paulo` in Prisma defaults. New module must respect this rigorously.
