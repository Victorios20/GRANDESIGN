# Validation Checklist: Phase 1 (Schema)

## 1. Migration Status
- [x] Migration `init_financial_module` applied successfully.
- [x] Prisma Client re-generated.

## 2. Table Verification
Verify existence using `psql` or `Prisma Studio`:

| Table | Expected | Status |
| :--- | :--- | :--- |
| `contas_bancarias` | Stores banks/wallets | ✅ Created |
| `categorias` | Hierarchical financial types | ✅ Created |
| `centros_custo` | Ties to Obra or generic | ✅ Created |
| `lancamentos` | The Ledger (source of truth) | ✅ Created |
| `contas_pagar` | Payables with installments | ✅ Created |
| `contas_receber` | Receivables with installments | ✅ Created |
| `transferencias` | Double-entry movement link | ✅ Created |

## 3. Relationships Check
- `User` -> `Lancamento` (Auditing) ✅
- `Obra` -> `CentroCusto` (One-to-many optional) ✅
- `PedidoCompra` -> `ContaPagar` (Link) ✅

## 4. Next Steps (Phase 2)
1.  Seed default categories (Receita/Despesa).
2.  Implement `BankService` to manage accounts.
3.  Implement `CategoryService` for tree structure.
