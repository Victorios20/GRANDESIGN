import fs from "node:fs"
import crypto from "node:crypto"
import {
  Prisma,
  PrismaClient,
  StatusConferencia,
  StatusFinanceiro,
  TipoCategoria,
  TipoContaBancaria,
  TipoLancamento,
} from "@prisma/client"
import {
  CATEGORY_LABEL_OVERRIDES,
  CLIENT_NAME_OVERRIDES,
  COST_CENTER_NAME_OVERRIDES,
  DEFAULT_CSV_PATH,
  REQUIRED_BANK_ACCOUNTS,
  SUBCATEGORY_OVERRIDE_BY_ROW_KEY,
  SUPPLIER_NAME_OVERRIDES,
  TRANSFER_DESTINATION_BY_ROW_KEY,
} from "./import-financial-history-2026.mapping"
import { rebuildBankCurrentBalances, type BankBalanceSnapshot } from "@/actions/financeiro/banks/balance-tools"

const prisma = new PrismaClient()

const IMPORT_NAMESPACE = "financial-history-2026"
const IMPORT_MARKER = `[IMPORT ${IMPORT_NAMESPACE}]`
const IMPORT_FINANCIAL_NOTE = `${IMPORT_MARKER} Importado do historico financeiro 2026.`
const IMPORT_COST_CENTER_DESCRIPTION = `${IMPORT_MARKER} Centro de custo criado automaticamente a partir do historico financeiro 2026.`
const OPENING_BALANCE_SUBCATEGORY_KEY = "receita de ajuste"
const TRANSFER_SUBCATEGORY_KEY = "transferencia"
const UNCATEGORIZED_LABEL_BY_DIRECTION = {
  ENTRADA: "Receita sem subcategoria",
  SAIDA: "Despesa sem subcategoria",
} as const

type CsvRow = Record<string, string>

interface ParsedRow {
  rowNumber: number
  key: string
  date: Date | null
  status: "EFETIVADO" | "PREVISTO"
  direction: "ENTRADA" | "SAIDA"
  amount: number
  bankName: string | null
  rawCategory: string
  categoryLabel: string
  categoryKey: string | null
  supplierName: string | null
  clientRaw: string | null
  clientName: string | null
  bairroHint: string | null
  workName: string | null
  costCenterTargetName: string | null
  notes: string | null
  isOpeningBalance: boolean
  isTransfer: boolean
}

interface ParsedArgs {
  apply: boolean
  filePath: string
  verbose: boolean
}

interface BankCacheEntry {
  id: number
  nome: string
  saldo_inicial: Prisma.Decimal
  saldo_atual: Prisma.Decimal
  ativo: boolean
}

interface CategoryCacheEntry {
  id: number
  nome: string
  tipo: TipoCategoria
}

interface ClientCacheEntry {
  id: number
  nome: string
}

interface WorkCacheEntry {
  id: number
  titulo: string | null
  cliente_id: number
}

interface SupplierCacheEntry {
  id: number
  nome: string
}

interface CostCenterCacheEntry {
  id: number
  nome: string
  obra_id: number | null
}

interface EnsureResult<T> {
  record: T
  created: boolean
}

interface ImportCaches {
  banks: Map<string, BankCacheEntry>
  categories: Map<string, CategoryCacheEntry>
  clients: Map<string, ClientCacheEntry>
  worksByClient: Map<string, WorkCacheEntry[]>
  suppliers: Map<string, SupplierCacheEntry>
  costCentersByName: Map<string, CostCenterCacheEntry[]>
  costCentersByWork: Map<number, CostCenterCacheEntry[]>
}

interface BlockedRow {
  rowNumber: number
  key: string
  reason: string
  status: ParsedRow["status"]
  type: ParsedRow["direction"]
  categoryLabel: string | null
  bankName: string | null
}

interface Summary {
  mode: "dry-run" | "apply"
  filePath: string
  totalRows: number
  actionableRows: number
  openingBalanceRows: number
  openingBalanceByBank: Record<string, number>
  contasPagarCriadas: number
  contasReceberCriadas: number
  lancamentosCriados: number
  transferenciasCriadas: number
  categoriasCriadas: number
  clientesCriados: number
  obrasCriadas: number
  fornecedoresCriados: number
  centrosCustoCriados: number
  contasBancariasCriadas: number
  bankBalanceDiagnostics: BankBalanceSnapshot[]
  blockedRows: BlockedRow[]
  skippedRows: BlockedRow[]
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2)
  const apply = args.includes("--apply")
  const verbose = args.includes("--verbose")
  const fileFlagIndex = args.findIndex((arg) => arg === "--file")
  const filePath =
    fileFlagIndex >= 0 && args[fileFlagIndex + 1]
      ? args[fileFlagIndex + 1]
      : DEFAULT_CSV_PATH

  return {
    apply,
    filePath,
    verbose,
  }
}

function normalizeKey(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function repairMojibake(value: string | null | undefined) {
  const sanitized = (value ?? "").trim()
  if (!sanitized) {
    return sanitized
  }

  if (!/[ÃÂ]/.test(sanitized)) {
    return sanitized
  }

  try {
    const repaired = Buffer.from(sanitized, "latin1").toString("utf8").trim()
    if (!repaired) {
      return sanitized
    }

    const replacementCount = (repaired.match(/\uFFFD/g) ?? []).length
    if (replacementCount > 0) {
      return sanitized
    }

    return repaired
  } catch {
    return sanitized
  }
}

function sanitizeText(value: string | null | undefined) {
  const normalized = repairMojibake(value).replace(/\s+/g, " ").trim()
  return normalized.length > 0 ? normalized : null
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 3)}...`
}

function parseDate(value: string) {
  const [dayText, monthText, yearText] = value.split("/")
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)

  if (!day || !month || !year) {
    throw new Error(`Data inválida: ${value}`)
  }

  return new Date(year, month - 1, day)
}

function parseOptionalDate(value: string | null | undefined) {
  const sanitized = sanitizeText(value)
  if (!sanitized) {
    return null
  }

  return parseDate(sanitized)
}

function parseCurrency(value: string) {
  const normalized = value
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim()

  const amount = Number(normalized)
  if (!Number.isFinite(amount)) {
    throw new Error(`Valor inválido: ${value}`)
  }

  return Number(amount.toFixed(2))
}

function parseCsvLine(line: string) {
  const columns: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (char === "," && !inQuotes) {
      columns.push(current)
      current = ""
      continue
    }

    current += char
  }

  columns.push(current)
  return columns
}

function readCsvRows(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    throw new Error("CSV vazio ou sem linhas de dados.")
  }

  const headers = parseCsvLine(lines[0])

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  })
}

function getCanonicalLabel(rawCategory: string | null, rowKey: string) {
  const overrideCategory = sanitizeText(SUBCATEGORY_OVERRIDE_BY_ROW_KEY[rowKey])
  const baseCategory = overrideCategory ?? sanitizeText(rawCategory)

  if (!baseCategory) {
    return null
  }

  const normalizedKey = normalizeKey(baseCategory)
  return CATEGORY_LABEL_OVERRIDES[normalizedKey] ?? baseCategory
}

function getFallbackCategoryLabel(direction: "ENTRADA" | "SAIDA") {
  return UNCATEGORIZED_LABEL_BY_DIRECTION[direction]
}

function deriveWorkName(clientName: string | null) {
  if (!clientName) {
    return null
  }

  const override = COST_CENTER_NAME_OVERRIDES[normalizeKey(clientName)]
  return sanitizeText(override ?? clientName)
}

function splitClientAndWorkHint(value: string | null) {
  const sanitized = sanitizeText(value)
  if (!sanitized) {
    return {
      clientName: null,
      bairroHint: null,
      workName: null,
      costCenterTargetName: null,
    }
  }

  const match = sanitized.match(/^(.*?)\s*\[([^\]]+)\]\s*$/)
  if (!match) {
    const overriddenName =
      CLIENT_NAME_OVERRIDES[normalizeKey(sanitized)] ?? sanitized
    const workName = deriveWorkName(overriddenName)

    return {
      clientName: overriddenName,
      bairroHint: null,
      workName,
      costCenterTargetName: workName,
    }
  }

  const [, rawClientName, rawBracketValue] = match
  const clientName =
    CLIENT_NAME_OVERRIDES[normalizeKey(rawClientName)] ?? sanitizeText(rawClientName)
  const bairroHint = sanitizeText(rawBracketValue)
  const workName = deriveWorkName(clientName ?? null)

  return {
    clientName: clientName ?? null,
    bairroHint: bairroHint ?? null,
    workName,
    costCenterTargetName: workName,
  }
}

function getImportKey(row: CsvRow, rowNumber: number) {
  const payload = [
    rowNumber,
    row["M\u00EAs"],
    row.Data,
    row.Status,
    row["Id do cliente"],
    row.Valor,
    row["Sub-categoria"],
    row.Tipo,
    row.Fornecedor,
    row["Observa\u00E7\u00F5es"],
    row.Conta,
    row["Conta destino"],
    row.Categoria,
  ].join("|")

  return crypto.createHash("sha1").update(payload).digest("hex")
}

function parseRow(row: CsvRow, rowNumber: number): ParsedRow {
  const statusKey = normalizeKey(row.Status)
  const key = getImportKey(row, rowNumber)
  const canonicalCategoryLabel = getCanonicalLabel(row["Sub-categoria"], key)
  const categoryKey = canonicalCategoryLabel ? normalizeKey(canonicalCategoryLabel) : null
  const directionKey = normalizeKey(row.Tipo)

  const status =
    statusKey === "efetivado"
      ? "EFETIVADO"
      : statusKey === "previsto"
        ? "PREVISTO"
        : null

  if (!status) {
    throw new Error(`Status desconhecido na linha ${rowNumber}: ${row.Status}`)
  }

  const inferredDirection =
    categoryKey === "pagamento de cliente" || categoryKey === "rendimento"
      ? "ENTRADA"
      : categoryKey === "retirada de lucro" ||
          categoryKey === "madeira" ||
          categoryKey === "telha" ||
          categoryKey === "mao de obra" ||
          categoryKey === "andaime" ||
          categoryKey === "compra de material" ||
          categoryKey === "tecnologia" ||
          categoryKey === "folha de pagamento" ||
          categoryKey === "contabilidade" ||
          categoryKey === "comissao" ||
          categoryKey === "combustivel" ||
          categoryKey === "fardamento" ||
          categoryKey === "frete" ||
          categoryKey === "imposto" ||
          categoryKey === "manutencao" ||
          categoryKey === "marketing" ||
          categoryKey === "materiais de escritorio" ||
          categoryKey === "refeicao" ||
          categoryKey === "taxa de cartao"
        ? "SAIDA"
        : null

  const direction =
    directionKey === "entrada"
      ? "ENTRADA"
      : directionKey === "saida"
        ? "SAIDA"
        : inferredDirection

  if (!direction) {
    throw new Error(`Tipo desconhecido na linha ${rowNumber}: ${row.Tipo}`)
  }

  const categoryLabel =
    canonicalCategoryLabel ?? getFallbackCategoryLabel(direction)

  const supplierRaw = sanitizeText(row.Fornecedor)
  const supplierName = supplierRaw
    ? SUPPLIER_NAME_OVERRIDES[normalizeKey(supplierRaw)] ?? supplierRaw
    : null
  const clientRaw = sanitizeText(row["Id do cliente"])
  const { clientName, bairroHint, workName, costCenterTargetName } =
    splitClientAndWorkHint(clientRaw)

  return {
    rowNumber,
    key,
    date: parseOptionalDate(row.Data),
    status,
    direction,
    amount: parseCurrency(row.Valor),
    bankName: sanitizeText(row.Conta),
    rawCategory: sanitizeText(row["Sub-categoria"]) ?? "",
    categoryLabel,
    categoryKey,
    supplierName,
    clientRaw,
    clientName,
    bairroHint,
    workName,
    costCenterTargetName,
    notes: sanitizeText(row["Observa\u00E7\u00F5es"]),
    isOpeningBalance: categoryKey === OPENING_BALANCE_SUBCATEGORY_KEY,
    isTransfer: categoryKey === TRANSFER_SUBCATEGORY_KEY,
  }
}

function createSummary(args: ParsedArgs): Summary {
  return {
    mode: args.apply ? "apply" : "dry-run",
    filePath: args.filePath,
    totalRows: 0,
    actionableRows: 0,
    openingBalanceRows: 0,
    openingBalanceByBank: {},
    contasPagarCriadas: 0,
    contasReceberCriadas: 0,
    lancamentosCriados: 0,
    transferenciasCriadas: 0,
    categoriasCriadas: 0,
    clientesCriados: 0,
    obrasCriadas: 0,
    fornecedoresCriados: 0,
    centrosCustoCriados: 0,
    contasBancariasCriadas: 0,
    bankBalanceDiagnostics: [],
    blockedRows: [],
    skippedRows: [],
  }
}

function pushMapArray<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const current = map.get(key) ?? []
  current.push(value)
  map.set(key, current)
}

function registerWork(caches: ImportCaches, work: WorkCacheEntry, clientName: string) {
  pushMapArray(caches.worksByClient, normalizeKey(clientName), work)
}

function registerCostCenter(caches: ImportCaches, costCenter: CostCenterCacheEntry) {
  pushMapArray(caches.costCentersByName, normalizeKey(costCenter.nome), costCenter)

  if (costCenter.obra_id) {
    pushMapArray(caches.costCentersByWork, costCenter.obra_id, costCenter)
  }
}

function collectAffectedBankIds(rows: ParsedRow[], caches: ImportCaches) {
  const bankIds = new Set<number>()

  for (const requiredBank of REQUIRED_BANK_ACCOUNTS) {
    const bank = caches.banks.get(normalizeKey(requiredBank))

    if (bank) {
      bankIds.add(bank.id)
    }
  }

  for (const row of rows) {
    if (row.bankName) {
      const sourceBank = caches.banks.get(normalizeKey(row.bankName))

      if (sourceBank) {
        bankIds.add(sourceBank.id)
      }
    }

    if (!row.isTransfer) {
      continue
    }

    const destinationName = TRANSFER_DESTINATION_BY_ROW_KEY[row.key]
    const destinationBank = destinationName
      ? caches.banks.get(normalizeKey(destinationName))
      : null

    if (destinationBank) {
      bankIds.add(destinationBank.id)
    }
  }

  return Array.from(bankIds)
}

async function loadCaches(): Promise<ImportCaches> {
  const [banks, categories, clients, works, suppliers, costCenters] = await Promise.all([
    prisma.contasBancaria.findMany({
      select: {
        id: true,
        nome: true,
        saldo_inicial: true,
        saldo_atual: true,
        ativo: true,
      },
    }),
    prisma.categoria.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, tipo: true },
    }),
    prisma.cliente.findMany({
      select: { id: true, nome: true },
    }),
    prisma.obras.findMany({
      select: {
        id: true,
        titulo: true,
        cliente_id: true,
        cliente: {
          select: {
            nome: true,
          },
        },
      },
    }),
    prisma.fornecedores.findMany({
      select: { id: true, nome: true },
    }),
    prisma.centroCusto.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, obra_id: true },
    }),
  ])

  const worksByClient = new Map<string, WorkCacheEntry[]>()
  for (const work of works) {
    registerWork(
      {
        banks: new Map(),
        categories: new Map(),
        clients: new Map(),
        worksByClient,
        suppliers: new Map(),
        costCentersByName: new Map(),
        costCentersByWork: new Map(),
      },
      {
        id: work.id,
        titulo: work.titulo,
        cliente_id: work.cliente_id,
      },
      work.cliente.nome,
    )
  }

  const costCentersByName = new Map<string, CostCenterCacheEntry[]>()
  const costCentersByWork = new Map<number, CostCenterCacheEntry[]>()
  for (const costCenter of costCenters) {
    registerCostCenter(
      {
        banks: new Map(),
        categories: new Map(),
        clients: new Map(),
        worksByClient: new Map(),
        suppliers: new Map(),
        costCentersByName,
        costCentersByWork,
      },
      costCenter,
    )
  }

  return {
    banks: new Map(
      banks.map((bank) => [normalizeKey(bank.nome), bank]),
    ),
    categories: new Map(
      categories.map((category) => [
        `${category.tipo}:${normalizeKey(category.nome)}`,
        category,
      ]),
    ),
    clients: new Map(
      clients.map((client) => [normalizeKey(client.nome), client]),
    ),
    worksByClient,
    suppliers: new Map(
      suppliers.map((supplier) => [normalizeKey(supplier.nome), supplier]),
    ),
    costCentersByName,
    costCentersByWork,
  }
}

async function getImporterUserId() {
  const admin = await prisma.user.findFirst({
    where: {
      is_active: true,
      roles: {
        some: {
          role: {
            name: "ADMIN",
          },
        },
      },
    },
    orderBy: { id: "asc" },
    select: { id: true },
  })

  return admin?.id ?? null
}

function getBankType(bankName: string) {
  return normalizeKey(bankName) === normalizeKey("Caixinha")
    ? TipoContaBancaria.CAIXA
    : TipoContaBancaria.CORRENTE
}

function createBlockedRow(row: ParsedRow, reason: string): BlockedRow {
  return {
    rowNumber: row.rowNumber,
    key: row.key,
    reason,
    status: row.status,
    type: row.direction,
    categoryLabel: row.categoryLabel,
    bankName: row.bankName,
  }
}

function ensureRequiredBanksPresence(parsedRows: ParsedRow[]) {
  const presentBanks = new Set(
    parsedRows
      .map((row) => row.bankName)
      .filter((bankName): bankName is string => Boolean(bankName))
      .map((bankName) => normalizeKey(bankName)),
  )

  for (const requiredBank of REQUIRED_BANK_ACCOUNTS) {
    if (!presentBanks.has(normalizeKey(requiredBank))) {
      throw new Error(`Conta obrigatória ausente no CSV: ${requiredBank}`)
    }
  }
}

function collectOpeningBalances(rows: ParsedRow[]) {
  const openingBalances = new Map<string, number>()

  for (const row of rows) {
    if (!row.isOpeningBalance || !row.bankName) {
      continue
    }

    const previous = openingBalances.get(row.bankName) ?? 0
    openingBalances.set(row.bankName, Number((previous + row.amount).toFixed(2)))
  }

  return openingBalances
}

async function ensureBank(
  caches: ImportCaches,
  summary: Summary,
  bankName: string,
  apply: boolean,
) {
  const key = normalizeKey(bankName)
  const existing = caches.banks.get(key)

  if (existing) {
    return existing
  }

  if (!apply) {
    const simulated: BankCacheEntry = {
      id: -1000 - summary.contasBancariasCriadas,
      nome: bankName,
      saldo_inicial: new Prisma.Decimal(0),
      saldo_atual: new Prisma.Decimal(0),
      ativo: true,
    }

    caches.banks.set(key, simulated)
    summary.contasBancariasCriadas += 1
    return simulated
  }

  const created = await prisma.contasBancaria.create({
    data: {
      nome: bankName,
      tipo: getBankType(bankName),
      saldo_inicial: new Prisma.Decimal(0),
      saldo_atual: new Prisma.Decimal(0),
      ativo: true,
    },
  })

  caches.banks.set(key, created)
  summary.contasBancariasCriadas += 1
  return created
}

async function ensureCategory(
  caches: ImportCaches,
  summary: Summary,
  label: string,
  type: TipoCategoria,
  apply: boolean,
) {
  const cacheKey = `${type}:${normalizeKey(label)}`
  const existing = caches.categories.get(cacheKey)

  if (existing) {
    return existing
  }

  if (!apply) {
    const simulated: CategoryCacheEntry = {
      id: -2000 - summary.categoriasCriadas,
      nome: label,
      tipo: type,
    }

    caches.categories.set(cacheKey, simulated)
    summary.categoriasCriadas += 1
    return simulated
  }

  const created = await prisma.categoria.create({
    data: {
      nome: label,
      tipo: type,
      ativo: true,
    },
  })

  caches.categories.set(cacheKey, created)
  summary.categoriasCriadas += 1
  return created
}

async function ensureClient(
  caches: ImportCaches,
  summary: Summary,
  name: string,
  bairroHint: string | null,
  apply: boolean,
): Promise<EnsureResult<ClientCacheEntry>> {
  const key = normalizeKey(name)
  const existing = caches.clients.get(key)

  if (existing) {
    return { record: existing, created: false }
  }

  if (!apply) {
    const simulated: ClientCacheEntry = {
      id: -3000 - summary.clientesCriados,
      nome: name,
    }

    caches.clients.set(key, simulated)
    summary.clientesCriados += 1
    return { record: simulated, created: true }
  }

  let created: ClientCacheEntry

  try {
    created = await prisma.cliente.create({
      data: {
        nome: name,
        bairro: bairroHint ?? undefined,
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingByName = await prisma.cliente.findFirst({
        where: { nome: { equals: name, mode: "insensitive" } },
        select: { id: true, nome: true },
      })

      if (!existingByName) {
        throw error
      }

      caches.clients.set(key, existingByName)
      return { record: existingByName, created: false }
    }

    throw error
  }

  caches.clients.set(key, created)
  summary.clientesCriados += 1
  return { record: created, created: true }
}

function getWorkObservation(name: string, bairroHint: string | null) {
  const parts = [
    `${IMPORT_MARKER} Obra criada automaticamente para importacao financeira 2026.`,
    `Cliente base: ${name}.`,
    bairroHint ? `Bairro original do CSV: ${bairroHint}.` : null,
  ].filter(Boolean)

  return parts.join("\n")
}

function resolveExistingWork(
  caches: ImportCaches,
  clientName: string,
  workName: string,
) {
  const candidates = caches.worksByClient.get(normalizeKey(clientName)) ?? []
  if (candidates.length === 0) {
    return null
  }

  const exactMatch = candidates.find(
    (candidate) => normalizeKey(candidate.titulo) === normalizeKey(workName),
  )

  if (exactMatch) {
    return exactMatch
  }

  return candidates.length === 1 ? candidates[0] : null
}

async function ensureWork(
  caches: ImportCaches,
  summary: Summary,
  client: ClientCacheEntry,
  workName: string,
  bairroHint: string | null,
  createdBy: number | null,
  apply: boolean,
): Promise<EnsureResult<WorkCacheEntry>> {
  const existing = resolveExistingWork(caches, client.nome, workName)
  if (existing) {
    return { record: existing, created: false }
  }

  if (!apply) {
    const simulated: WorkCacheEntry = {
      id: -6000 - summary.obrasCriadas,
      titulo: workName,
      cliente_id: client.id,
    }

    registerWork(caches, simulated, client.nome)
    summary.obrasCriadas += 1
    return { record: simulated, created: true }
  }

  const created = await prisma.obras.create({
    data: {
      cliente_id: client.id,
      titulo: truncate(workName, 150),
      endereco_obra: truncate(
        bairroHint ? `Bairro ${bairroHint}` : "Endereco nao informado",
        255,
      ),
      maps_url: "",
      tipo_obra: "Importacao Financeira",
      largura: new Prisma.Decimal("0"),
      comprimento: new Prisma.Decimal("0"),
      telha_escolhida: "Nao informado",
      valor_obra: new Prisma.Decimal("0"),
      valor_mao_de_obra: new Prisma.Decimal("0"),
      observacoes: getWorkObservation(client.nome, bairroHint),
      ...(createdBy ? { created_by: createdBy, updated_by: createdBy } : {}),
    },
    select: {
      id: true,
      titulo: true,
      cliente_id: true,
    },
  })

  registerWork(caches, created, client.nome)
  summary.obrasCriadas += 1
  return { record: created, created: true }
}

async function ensureSupplier(
  caches: ImportCaches,
  summary: Summary,
  name: string,
  apply: boolean,
) {
  const key = normalizeKey(name)
  const existing = caches.suppliers.get(key)

  if (existing) {
    return existing
  }

  if (!apply) {
    const simulated: SupplierCacheEntry = {
      id: -4000 - summary.fornecedoresCriados,
      nome: name,
    }

    caches.suppliers.set(key, simulated)
    summary.fornecedoresCriados += 1
    return simulated
  }

  let created: SupplierCacheEntry

  try {
    created = await prisma.fornecedores.create({
      data: {
        nome: name,
        tipo: "FINANCEIRO",
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingByName = await prisma.fornecedores.findUnique({
        where: { nome: name },
        select: { id: true, nome: true },
      })

      if (!existingByName) {
        throw error
      }

      caches.suppliers.set(key, existingByName)
      return existingByName
    }

    throw error
  }

  caches.suppliers.set(key, created)
  summary.fornecedoresCriados += 1
  return created
}

async function ensureCostCenter(
  caches: ImportCaches,
  summary: Summary,
  work: WorkCacheEntry,
  name: string,
  apply: boolean,
) : Promise<EnsureResult<CostCenterCacheEntry>> {
  const existingByWork = caches.costCentersByWork.get(work.id)?.[0]

  if (existingByWork) {
    return { record: existingByWork, created: false }
  }

  if (!apply) {
    const simulated: CostCenterCacheEntry = {
      id: -5000 - summary.centrosCustoCriados,
      nome: truncate(name, 150),
      obra_id: work.id,
    }

    registerCostCenter(caches, simulated)
    summary.centrosCustoCriados += 1
    return { record: simulated, created: true }
  }

  const created = await prisma.centroCusto.create({
    data: {
      nome: name,
      descricao: "Criado automaticamente a partir do histórico financeiro 2026.",
      ativo: true,
      obra_id: work.id,
    },
  })

  registerCostCenter(caches, created)
  summary.centrosCustoCriados += 1
  return { record: created, created: true }
}

function buildEntityDescription(row: ParsedRow) {
  const parts: string[] = []
  const pushUnique = (value: string | null | undefined) => {
    const sanitized = sanitizeText(value)
    if (!sanitized) {
      return
    }

    if (parts.some((part) => normalizeKey(part) === normalizeKey(sanitized))) {
      return
    }

    parts.push(sanitized)
  }

  pushUnique(row.categoryLabel)

  if (row.direction === "ENTRADA" && row.clientName) {
    pushUnique(row.clientName)
  }

  if (row.direction === "SAIDA" && row.supplierName) {
    pushUnique(row.supplierName)
  }

  if (row.workName) {
    pushUnique(row.workName)
  }

  return truncate(parts.join(" - "), 190)
}

function buildObservations(row: ParsedRow) {
  const notes = [
    IMPORT_FINANCIAL_NOTE,
    `CSV linha ${row.rowNumber}.`,
    row.clientRaw ? `Cliente original: ${row.clientRaw}.` : null,
    row.clientName ? `Cliente base: ${row.clientName}.` : null,
    row.workName ? `Obra/centro alvo: ${row.workName}.` : null,
    row.bairroHint ? `Bairro original do CSV: ${row.bairroHint}.` : null,
    row.supplierName ? `Fornecedor original: ${row.supplierName}.` : null,
    row.notes ? `Observa\u00E7\u00F5es CSV: ${row.notes}.` : null,
    row.bankName ? `Conta origem CSV: ${row.bankName}.` : null,
  ].filter(Boolean)

  return notes.join("\n")
}

function getOpenStatus(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return date < today ? StatusFinanceiro.ATRASADO : StatusFinanceiro.PENDENTE
}

async function applyOpeningBalances(
  openingBalances: Map<string, number>,
  caches: ImportCaches,
  summary: Summary,
  apply: boolean,
) {
  for (const bankName of REQUIRED_BANK_ACCOUNTS) {
    const amount = Number((openingBalances.get(bankName) ?? 0).toFixed(2))
    summary.openingBalanceByBank[bankName] = amount
    await ensureBank(caches, summary, bankName, apply)

    if (!apply) {
      continue
    }

    const idempotencyKey = `${IMPORT_NAMESPACE}:opening:${normalizeKey(bankName)}`
    const existingLog = await prisma.idempotencyLog.findUnique({
      where: { key: idempotencyKey },
    })

    if (existingLog?.status === "COMPLETED") {
      continue
    }

    const bank = caches.banks.get(normalizeKey(bankName))
    if (!bank) {
      throw new Error(`Conta bancária não localizada para saldo inicial: ${bankName}`)
    }

    await prisma.$transaction(async (tx) => {
      const existingTransactions = await tx.lancamento.count({
        where: { conta_bancaria_id: bank.id },
      })

      if (existingTransactions > 0) {
        const currentOpeningBalance = Number(bank.saldo_inicial.toString())

        if (Number(currentOpeningBalance.toFixed(2)) === amount) {
          await tx.idempotencyLog.upsert({
            where: { key: idempotencyKey },
            create: {
              key: idempotencyKey,
              status: "COMPLETED",
              result: JSON.stringify({
                bankId: bank.id,
                openingBalance: amount,
                reusedExistingOpeningBalance: true,
              }),
            },
            update: {
              status: "COMPLETED",
              result: JSON.stringify({
                bankId: bank.id,
                openingBalance: amount,
                reusedExistingOpeningBalance: true,
              }),
            },
          })

          return
        }

        throw new Error(
            `Não foi possível aplicar saldo inicial em ${bankName} porque já existem lançamentos na conta.`,
        )
      }

      await tx.idempotencyLog.upsert({
        where: { key: idempotencyKey },
        create: { key: idempotencyKey, status: "PENDING" },
        update: { status: "PENDING", result: null },
      })

      await tx.contasBancaria.update({
        where: { id: bank.id },
        data: {
          saldo_inicial: new Prisma.Decimal(amount.toFixed(2)),
          saldo_atual: new Prisma.Decimal(amount.toFixed(2)),
        },
      })

      await tx.idempotencyLog.update({
        where: { key: idempotencyKey },
        data: {
          status: "COMPLETED",
          result: JSON.stringify({ bankId: bank.id, openingBalance: amount }),
        },
      })
    })

    caches.banks.set(normalizeKey(bankName), {
      ...bank,
      saldo_inicial: new Prisma.Decimal(amount.toFixed(2)),
      saldo_atual: new Prisma.Decimal(amount.toFixed(2)),
    })
  }
}

async function processTransferRow(
  row: ParsedRow,
  caches: ImportCaches,
  summary: Summary,
  apply: boolean,
  createdBy: number | null,
) {
  if (!row.date) {
    summary.blockedRows.push(
      createBlockedRow(row, "Transferência sem data preenchida no CSV."),
    )
    return
  }

  if (row.status === "PREVISTO") {
    summary.blockedRows.push(
      createBlockedRow(row, "Transferência prevista sem suporte no modelo atual."),
    )
    return
  }

  if (!row.bankName) {
    summary.blockedRows.push(
      createBlockedRow(row, "Transferência sem conta de origem preenchida."),
    )
    return
  }

  const destinationBankName = sanitizeText(TRANSFER_DESTINATION_BY_ROW_KEY[row.key])
  if (!destinationBankName) {
    summary.blockedRows.push(
      createBlockedRow(row, "Transferência sem conta destino mapeada."),
    )
    return
  }

  const sourceBank = await ensureBank(caches, summary, row.bankName, apply)
  const destinationBank = await ensureBank(caches, summary, destinationBankName, apply)
  const revenueCategory = await ensureCategory(
    caches,
    summary,
    "Transferências (Entrada)",
    TipoCategoria.RECEITA,
    apply,
  )
  const expenseCategory = await ensureCategory(
    caches,
    summary,
    "Transferências (Saída)",
    TipoCategoria.DESPESA,
    apply,
  )

  if (!apply) {
    summary.transferenciasCriadas += 1
    summary.lancamentosCriados += 2
    return
  }

  const idempotencyKey = `${IMPORT_NAMESPACE}:transfer:${row.key}`

  try {
    const eventDate = row.date
    const result = await prisma.$transaction(async (tx) => {
      const existingLog = await tx.idempotencyLog.findUnique({
        where: { key: idempotencyKey },
      })

      if (existingLog?.status === "COMPLETED") {
        return null
      }

      await tx.idempotencyLog.upsert({
        where: { key: idempotencyKey },
        create: { key: idempotencyKey, status: "PENDING" },
        update: { status: "PENDING", result: null },
      })

      const transfer = await tx.transferencia.create({
        data: {
          descricao: truncate(`Transferência - ${row.bankName} para ${destinationBankName}`, 255),
          valor: new Prisma.Decimal(row.amount.toFixed(2)),
          data_transferencia: eventDate,
          conta_origem_id: sourceBank.id,
          conta_destino_id: destinationBank.id,
          created_by: createdBy,
        },
      })

      await tx.lancamento.createMany({
        data: [
          {
            tipo: TipoLancamento.DESPESA,
            descricao: truncate(`Transferência enviada - ${destinationBankName}`, 255),
            valor: new Prisma.Decimal(row.amount.toFixed(2)),
            data_lancamento: eventDate,
            data_competencia: eventDate,
            observacoes: buildObservations(row),
            status_conferencia: StatusConferencia.CONFERIDO,
            conferido_em: eventDate,
            conta_bancaria_id: sourceBank.id,
            categoria_id: expenseCategory.id,
            transferencia_id: transfer.id,
            created_by: createdBy,
          },
          {
            tipo: TipoLancamento.RECEITA,
            descricao: truncate(`Transferência recebida - ${row.bankName}`, 255),
            valor: new Prisma.Decimal(row.amount.toFixed(2)),
            data_lancamento: eventDate,
            data_competencia: eventDate,
            observacoes: buildObservations(row),
            status_conferencia: StatusConferencia.CONFERIDO,
            conferido_em: eventDate,
            conta_bancaria_id: destinationBank.id,
            categoria_id: revenueCategory.id,
            transferencia_id: transfer.id,
            created_by: createdBy,
          },
        ],
      })

      await tx.contasBancaria.update({
        where: { id: sourceBank.id },
        data: { saldo_atual: { decrement: new Prisma.Decimal(row.amount.toFixed(2)) } },
      })

      await tx.contasBancaria.update({
        where: { id: destinationBank.id },
        data: { saldo_atual: { increment: new Prisma.Decimal(row.amount.toFixed(2)) } },
      })

      const completedResult = { transferId: transfer.id }

      await tx.idempotencyLog.update({
        where: { key: idempotencyKey },
        data: { status: "COMPLETED", result: JSON.stringify(completedResult) },
      })

      return completedResult
    })

    if (!result) {
      summary.skippedRows.push(
        createBlockedRow(row, "Transferência já importada anteriormente."),
      )
      return
    }

    summary.transferenciasCriadas += 1
    summary.lancamentosCriados += 2
  } catch (error) {
    throw error
  }
}

async function processFinancialRow(
  row: ParsedRow,
  caches: ImportCaches,
  summary: Summary,
  apply: boolean,
  createdBy: number | null,
) {
  if (row.isTransfer) {
    await processTransferRow(row, caches, summary, apply, createdBy)
    return
  }

  if (!row.date) {
    summary.blockedRows.push(
      createBlockedRow(row, "Linha sem data preenchida no CSV."),
    )
    return
  }

  if (row.status === "EFETIVADO" && !row.bankName) {
    summary.blockedRows.push(
      createBlockedRow(row, "Linha efetivada sem conta bancária de origem."),
    )
    return
  }

  const bank =
    row.bankName != null ? await ensureBank(caches, summary, row.bankName, apply) : null
  const category = await ensureCategory(
    caches,
    summary,
    row.categoryLabel,
    row.direction === "ENTRADA" ? TipoCategoria.RECEITA : TipoCategoria.DESPESA,
    apply,
  )
  const client = row.clientName
    ? await ensureClient(caches, summary, row.clientName, row.bairroHint, apply)
    : null
  const work =
    client?.record && row.workName
      ? await ensureWork(
          caches,
          summary,
          client.record,
          row.workName,
          row.bairroHint,
          createdBy,
          apply,
        )
      : null
  const supplier =
    row.direction === "SAIDA" && row.supplierName
      ? await ensureSupplier(caches, summary, row.supplierName, apply)
      : null
  const costCenter = work?.record && row.costCenterTargetName
    ? await ensureCostCenter(caches, summary, work.record, row.costCenterTargetName, apply)
    : null

  if (!apply) {
    if (row.direction === "ENTRADA") {
      summary.contasReceberCriadas += 1
    } else {
      summary.contasPagarCriadas += 1
    }

    if (row.status === "EFETIVADO") {
      summary.lancamentosCriados += 1
    }

    return
  }

  const idempotencyKey = `${IMPORT_NAMESPACE}:row:${row.key}`
  const description = buildEntityDescription(row)
  const observations = buildObservations(row)
  const eventDate = row.date

  try {
    const result =
      row.direction === "ENTRADA"
        ? await prisma.$transaction(async (tx) => {
            const existingLog = await tx.idempotencyLog.findUnique({
              where: { key: idempotencyKey },
            })

            if (existingLog?.status === "COMPLETED") {
              return null
            }

            await tx.idempotencyLog.upsert({
              where: { key: idempotencyKey },
              create: { key: idempotencyKey, status: "PENDING" },
              update: { status: "PENDING", result: null },
            })

            const contaReceber = await tx.contaReceber.create({
              data: {
                descricao: truncate(description, 190),
                valor_total: new Prisma.Decimal(row.amount.toFixed(2)),
                valor_recebido:
                  row.status === "EFETIVADO"
                    ? new Prisma.Decimal(row.amount.toFixed(2))
                    : new Prisma.Decimal(0),
                data_emissao: eventDate,
                data_vencimento: eventDate,
                data_recebimento: row.status === "EFETIVADO" ? eventDate : null,
                status:
                  row.status === "EFETIVADO"
                    ? StatusFinanceiro.PAGO
                    : getOpenStatus(eventDate),
                cliente_id: client?.record.id ?? null,
                categoria_id: category.id,
                centro_custo_id: costCenter?.record.id ?? null,
                observacoes: observations,
                created_by: createdBy,
              },
            })

            let lancamentoId: number | null = null

            if (row.status === "EFETIVADO") {
              const lancamento = await tx.lancamento.create({
                data: {
                  tipo: TipoLancamento.RECEITA,
                  descricao: truncate(`Recebimento: ${description}`, 255),
                  valor: new Prisma.Decimal(row.amount.toFixed(2)),
                  data_lancamento: eventDate,
                  data_competencia: eventDate,
                  observacoes: observations,
                  status_conferencia: StatusConferencia.CONFERIDO,
                  conferido_em: eventDate,
                  conta_bancaria_id: bank!.id,
                  categoria_id: category.id,
                  centro_custo_id: costCenter?.record.id ?? null,
                  conta_receber_id: contaReceber.id,
                  created_by: createdBy,
                },
              })

              lancamentoId = lancamento.id

              await tx.contasBancaria.update({
                where: { id: bank!.id },
                data: {
                  saldo_atual: {
                    increment: new Prisma.Decimal(row.amount.toFixed(2)),
                  },
                },
              })
            }

            const completedResult = {
              contaReceberId: contaReceber.id,
              lancamentoId,
              createdClientId: client?.created ? client.record.id : null,
              createdWorkId: work?.created ? work.record.id : null,
              createdCostCenterId: costCenter?.created ? costCenter.record.id : null,
            }

            await tx.idempotencyLog.update({
              where: { key: idempotencyKey },
              data: { status: "COMPLETED", result: JSON.stringify(completedResult) },
            })

            return completedResult
          })
        : await prisma.$transaction(async (tx) => {
            const existingLog = await tx.idempotencyLog.findUnique({
              where: { key: idempotencyKey },
            })

            if (existingLog?.status === "COMPLETED") {
              return null
            }

            await tx.idempotencyLog.upsert({
              where: { key: idempotencyKey },
              create: { key: idempotencyKey, status: "PENDING" },
              update: { status: "PENDING", result: null },
            })

            const contaPagar = await tx.contaPagar.create({
              data: {
                descricao: truncate(description, 190),
                valor_total: new Prisma.Decimal(row.amount.toFixed(2)),
                valor_pago:
                  row.status === "EFETIVADO"
                    ? new Prisma.Decimal(row.amount.toFixed(2))
                    : new Prisma.Decimal(0),
                data_emissao: eventDate,
                data_vencimento: eventDate,
                data_pagamento: row.status === "EFETIVADO" ? eventDate : null,
                status:
                  row.status === "EFETIVADO"
                    ? StatusFinanceiro.PAGO
                    : getOpenStatus(eventDate),
                fornecedor_id: supplier?.id ?? null,
                categoria_id: category.id,
                centro_custo_id: costCenter?.record.id ?? null,
                observacoes: observations,
                created_by: createdBy,
              },
            })

            let lancamentoId: number | null = null

            if (row.status === "EFETIVADO") {
              const lancamento = await tx.lancamento.create({
                data: {
                  tipo: TipoLancamento.DESPESA,
                  descricao: truncate(`Pagamento: ${description}`, 255),
                  valor: new Prisma.Decimal(row.amount.toFixed(2)),
                  data_lancamento: eventDate,
                  data_competencia: eventDate,
                  observacoes: observations,
                  status_conferencia: StatusConferencia.CONFERIDO,
                  conferido_em: eventDate,
                  conta_bancaria_id: bank!.id,
                  categoria_id: category.id,
                  centro_custo_id: costCenter?.record.id ?? null,
                  conta_pagar_id: contaPagar.id,
                  created_by: createdBy,
                },
              })

              lancamentoId = lancamento.id

              await tx.contasBancaria.update({
                where: { id: bank!.id },
                data: {
                  saldo_atual: {
                    decrement: new Prisma.Decimal(row.amount.toFixed(2)),
                  },
                },
              })
            }

            const completedResult = {
              contaPagarId: contaPagar.id,
              lancamentoId,
              createdClientId: client?.created ? client.record.id : null,
              createdWorkId: work?.created ? work.record.id : null,
              createdCostCenterId: costCenter?.created ? costCenter.record.id : null,
            }

            await tx.idempotencyLog.update({
              where: { key: idempotencyKey },
              data: { status: "COMPLETED", result: JSON.stringify(completedResult) },
            })

            return completedResult
          })

    if (!result) {
      summary.skippedRows.push(
        createBlockedRow(row, "Linha já importada anteriormente."),
      )
      return
    }

    if (row.direction === "ENTRADA") {
      summary.contasReceberCriadas += 1
    } else {
      summary.contasPagarCriadas += 1
    }

    if (row.status === "EFETIVADO") {
      summary.lancamentosCriados += 1
    }
  } catch (error) {
    throw error
  }
}

async function main() {
  const args = parseArgs()
  const summary = createSummary(args)
  const rawRows = readCsvRows(args.filePath)
  const parsedRows = rawRows.map((row, index) => parseRow(row, index + 2))
  const actionableRows = parsedRows.filter((row) => !row.isOpeningBalance)
  const openingBalances = collectOpeningBalances(parsedRows)
  const caches = await loadCaches()
  const createdBy = await getImporterUserId()

  ensureRequiredBanksPresence(parsedRows)

  summary.totalRows = parsedRows.length
  summary.actionableRows = actionableRows.length
  summary.openingBalanceRows = parsedRows.filter((row) => row.isOpeningBalance).length

  await applyOpeningBalances(openingBalances, caches, summary, args.apply)

  for (const row of actionableRows) {
    await processFinancialRow(row, caches, summary, args.apply, createdBy)
  }

  if (args.apply) {
    const affectedBankIds = collectAffectedBankIds(parsedRows, caches)
    summary.bankBalanceDiagnostics = await rebuildBankCurrentBalances(prisma, affectedBankIds)
  }

  if (args.verbose) {
    console.log(
      JSON.stringify(
        {
          blockedRows: summary.blockedRows,
          skippedRows: summary.skippedRows,
        },
        null,
        2,
      ),
    )
  }

  console.log(JSON.stringify(summary, null, 2))
}

main()
  .catch((error) => {
    console.error("[X] Falha na importação:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
