# Architecture Decisions (ADRs) - Financial Module

## ADR-001: Ledger as Source of Truth
**Status**: Proposed
**Context**: Financial data is currently scattered across `Obra`, `Orcamento`, and `PedidoCompra`.
**Decision**: Create a `lancamentos` table (Ledger) that is the **single source of truth** for all money movements (In/Out/Transfer).
**Consequence**: All other entities (`Obra`, `ContaPagar`) must derive "Amounts Paid" by querying the Ledger or caching the sum. We will cache `valor_pago` on `ContaPagar` for performance, but the Ledger is the audit trail.

## ADR-002: Computed Account Balances
**Status**: Proposed
**Context**: Bank account balances must be accurate. Calculating `sum(in) - sum(out)` on every read is expensive.
**Decision**: Store `saldo_atual` on `contas_bancarias`. Update it transactionally whenever a `lancamento` is created/updated/deleted.
**Consequence**: Requires strict database transactions or Prisma middleware to ensure `saldo_atual` never drifts.

## ADR-003: Double-Entry via "Transfers"
**Status**: Proposed
**Context**: Transfers involve two accounts.
**Decision**: A Transfer creates 2 Ledger entries: one implementation (Out) from Origin, one (In) to Destination.
**Consequence**: Ensures Ledger integrity per account.

## ADR-004: Money Type
**Status**: Proposed
**Context**: Floating point errors.
**Decision**: Use `Decimal` (Prisma/Postgres) for all monetary values. Front-end uses currency masking libraries. Storage is always raw decimal.

## ADR-005: Timezones
**Status**: Proposed
**Context**: Brazil accounts.
**Decision**: All dates stored as UTC in DB (Postgres standard), but application logic enforces `America/Sao_Paulo` for "Business Date" (Data Competência).
**Consequence**: Reports (DRE) must query by "Business Date", not "Created At".

## ADR-006: Synchronization Strategy
**Status**: Proposed
**Context**: `PedidoCompra` creates a payable.
**Decision**: Trigger-based application logic (Service Layer). When `PedidoCompra` is "Approved", created a draft `ContaPagar`.
**Conflict**: If `PedidoCompra` flows to `ContaPagar`, editing `PedidoCompra` after payment logic starts is complex.
**Recommendation**: Lock `PedidoCompra` value once it is synced to `ContaPagar`. Any adjustments must be separate "Adjustment" entries.
