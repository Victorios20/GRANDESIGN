# Implementation Plan: Financial Module

## Phase 1: Foundation (Essential Data Structure)
**Goal**: Establish the base tables and CRUD for financial entities.
**Definition of Done**: Tables created, Migrations run, Basic CRUD API endpoints active for Banks/Categories.

- [ ] **Schema Migration**:
    - [x] Create `contas_bancarias` table (Banks).
    - [x] Create `categorias` table (Revenue/Expense hierarchical).
    - [x] Create `centros_custo` table (Cost Centers).
    - [x] Create `lancamentos` table (Ledger).
    - [x] Create `contas_pagar` & `contas_receber` tables.
    - [x] Add Relationships (User, Obra).
- [ ] **Seed Data**:
    - [ ] Default Categories (Receitas/Despesas).
    - [ ] Default Banks (Caixa Pequeno).
- [ ] **Core Services**:
    - [ ] `BankService` (CRUD).
    - [ ] `CategoryService` (CRUD + Tree view).

## Phase 2: Transaction Engine (The "Brain")
**Goal**: Implement the logic for moving money and calculating balances.
**Definition of Done**: Can create In/Out/Transfer, Balances update automatically, History is auditable.

- [ ] **Ledger Logic**:
    - [ ] Implement `TransactionService.create()` (Updates Account Balance).
    - [ ] Implement `TransferService.execute()` (Double entry).
- [ ] **Accounts Payable/Receivable Logic**:
    - [ ] Implement Parsing/Installments logic (1x to 36x).
    - [ ] "Pay Bill" action (Creates Ledger Entry + Updates Bill Status).
    - [ ] "Receive Bill" action.

## Phase 3: Integration (Connecting Obras & Purchasing)
**Goal**: Automate financial entries from operational actions.
**Definition of Done**: Creating an Obra creates a Cost Center. Approving a Purchase Order creates a Payable.

- [ ] **Obra Sync**:
    - [ ] Hook: On Obra Create -> Create Cost Center.
- [ ] **Purchase Order Sync**:
    - [ ] Hook: On PedidoCompra "Aprovado" -> Create `ContaPagar`.
- [ ] **Legacy Data Migration (Optional/Manual)**:
    - [ ] Script to import existing Obra payments as `ContasReceber` (Warning: High risk of duplication, manual review recommended).

## Phase 4: UI & Reporting (Visibility)
**Goal**: Give users the Dashboard and Reports.
**Definition of Done**: Dashboard Active, DRE functional.

- [ ] **Dashboard**:
    - [ ] KPI Cards (Balance, Pending).
    - [ ] Recent Transactions Table.
- [ ] **Management Pages**:
    - [ ] Payables/Receivables List (Filters: Date, Category, Supplier).
    - [ ] Bank Accounts List.
- [ ] **Reports**:
    - [ ] DRE (Income Statement) Generator.
    - [ ] Cash Flow View.

## Definition of Done (General)
- [ ] **Test Coverage**: Unit tests for `TransactionService` (Balance calculations).
- [ ] **Linting**: No errors in new files.
- [ ] **Types**: Full Zod validation for all inputs.
- [ ] **UI**: Responsive (Mobile/Desktop) via Tailwind/Shadcn.
