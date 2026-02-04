
export interface MaterialDTO {
    id: number
    descricao: string
    tipo: string
    preco_unitario: number
    unidade_de_medida?: string | null
    fornecedorId?: number | null
}

export interface ComponenteDTO {
    id: number
    nome: string
}

export interface FornecedorDTO {
    id: number
    nome: string
    tipo: string
    // telefone/email removed as they are not in schema
}

// Helpers
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...options, cache: "no-store" })
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro na requisição para ${url}`)
    }
    return res.json()
}

/* =========================================================================
   FORNECEDORES
   ========================================================================= */

export async function getFornecedores(): Promise<FornecedorDTO[]> {
    return fetchJson<FornecedorDTO[]>("/api/fornecedores")
}

export async function createFornecedor(data: { nome: string; tipo: string }) {
    return fetchJson<{ id: number; nome: string }>("/api/fornecedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
}

export async function updateFornecedor(id: number, data: { nome?: string; tipo?: string }) {
    return fetchJson<{ id: number }>(`/api/fornecedores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
}

export async function deleteFornecedor(id: number) {
    return fetchJson<{ ok: true; id: number }>(`/api/fornecedores/${id}`, {
        method: "DELETE",
    })
}

/* =========================================================================
   MATERIAIS (Geral, Madeira, Telha)
   ========================================================================= */

export async function getMateriais(params?: { fornecedorId?: number; tipo?: string }): Promise<MaterialDTO[]> {
    const searchParams = new URLSearchParams()
    if (params?.fornecedorId) searchParams.set("fornecedorId", String(params.fornecedorId))
    if (params?.tipo) searchParams.set("tipo", params.tipo)

    return fetchJson<MaterialDTO[]>(`/api/materiais?${searchParams.toString()}`)
}

export async function createMaterial(data: {
    descricao: string
    tipo: string // 'geral' | 'madeira' | 'telha' | 'material'
    preco_unitario: number
    unidade_de_medida?: string | null
    fornecedorId?: number | null
}) {
    return fetchJson<{ id: number }>("/api/materiais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
}

export async function updateMaterial(
    id: number,
    data: {
        descricao?: string
        preco_unitario?: number
        unidade_de_medida?: string | null
        fornecedorId?: number | null
    }
) {
    return fetchJson<{ id: number }>(`/api/materiais/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
}

export async function deleteMaterial(id: number) {
    return fetchJson<{ ok: true; id: number }>(`/api/materiais/${id}`, {
        method: "DELETE",
    })
}

/* =========================================================================
   COMPONENTES
   ========================================================================= */

export async function getComponentes(): Promise<ComponenteDTO[]> {
    return fetchJson<ComponenteDTO[]>("/api/componentes")
}

export async function createComponente(data: { nome: string }) {
    return fetchJson<{ id: number; nome: string }>("/api/componentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
}

export async function updateComponente(id: number, data: { nome: string }) {
    return fetchJson<{ ok: true; id: number }>(`/api/componentes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
}

export async function deleteComponente(id: number) {
    return fetchJson<{ ok: true; id: number }>(`/api/componentes/${id}`, {
        method: "DELETE",
    })
}
