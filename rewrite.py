import sys

def rewrite():
    file_path = r"c:\Users\kbrit\Documents\GitHub\GRANDESIGN\src\app\orcamento\OrcamentoClient.tsx"
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    imp_start = -1
    for i, l in enumerate(lines):
        if "import MUIDataTable" in l:
            imp_start = i
            break
            
    imp_end = -1
    for i in range(imp_start, len(lines)):
        if "import ExcluirModalOrcamento" in lines[i]:
            imp_end = i
            break
            
    # New imports
    new_imports = """import { DataTable, type DataTableColumn } from "@/components/ds/DataTable"
import { FilterToolbar, type ActiveFilter } from "@/components/ds/FilterToolbar"
import { PageShell } from "@/components/ds/PageShell"
import { StatusBadge } from "@/components/ds/StatusBadge"
import ExcluirModalOrcamento from "@/components/modals/ExcluirModalOrcamento"
"""

    const_start = -1
    for i, l in enumerate(lines):
        if "const BEGE = " in l:
            const_start = i
            break
            
    const_end = -1
    for i in range(const_start, len(lines)):
        if "type StatusExcluido" in lines[i]:
            const_end = i
            break
            
    # Remove BEGE and MARROM line range [const_start, const_end] (excluding StatusExcluido)
    
    col_start = -1
    for i, l in enumerate(lines):
        if "const columns: MUIDataTableColumnDef[] =" in l:
            col_start = i
            break
            
    theme_end = -1
    for i in range(col_start, len(lines)):
        if "const headerActions =" in lines[i]:
            theme_end = i
            break

    # New columns
    new_columns = """  const columns: DataTableColumn<OrcRow>[] = [
    { key: "titulo", label: "Título" },
    { key: "cliente", label: "Cliente" },
    { key: "bairro", label: "Bairro", render: (r) => safeCell(r.bairro) },
    { key: "cidade", label: "Cidade", render: (r) => safeCell(r.cidade) },
    {
      key: "tipoObra",
      label: "Tipo de obra",
      render: (r) => r.tipoObra ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold border border-[#d9d3c8] bg-[#faf8f4] text-[#2c201b] whitespace-nowrap">
          {r.tipoObra}
        </span>
      ) : <span className="text-[#7b705f]">—</span>
    },
    {
      key: "corStain",
      label: "Cor do Stain",
      hiddenOnMobile: true,
      render: (r) => r.corStain ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold border border-[#d9d3c8] bg-[#faf8f4] text-[#2c201b] whitespace-nowrap">
          {r.corStain}
        </span>
      ) : <span className="text-[#7b705f]">—</span>
    },
    {
      key: "situacao",
      label: "Situação",
      hiddenOnMobile: true,
      render: (r) => {
        if (r.excluido) return <StatusBadge status="EXCLUIDO" />
        if (r.lancadoObra) return <StatusBadge status="EM_OBRA" />
        return <StatusBadge status="ATIVO" />
      }
    },
    { key: "data_ultima_alteracao", label: "Atualização", render: (r) => strDate(r.data_ultima_alteracao) },
    { key: "clienteTelefone", label: "Telefone", render: (r) => safeCell(r.clienteTelefone) },
    { key: "valorFormatado", label: "Valor", render: (r) => safeCell(r.valorFormatado), align: "right" },
    {
      key: "acoes",
      label: "",
      align: "right",
      render: (o) => {
        const isLancado = !!o.lancadoObra
        const isExcluido = !!o.excluido
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="text-[#6f6556] hover:bg-[#f3efe6]">
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem className="cursor-pointer" onSelect={async () => {
                  const link = `https://app.grandesignce.com.br/orcamento/detalhes/${(o as any).id}`
                  try {
                    await navigator.clipboard.writeText(link)
                    toast.success("Link copiado!")
                  } catch {
                    toast.error("Não foi possível copiar o link.")
                  }
                }}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar link de visualização
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/orcamento/edit/${(o as any).id}`} target="_blank">
                    <Pencil className="mr-2 h-4 w-4" /> Editar orçamento
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/orcamento/detalhes/${(o as any).id}`} target="_blank">
                    <Eye className="mr-2 h-4 w-4" /> Visualizar detalhes
                  </Link>
                </DropdownMenuItem>
                {!isLancado ? (
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={`/obras/new/${(o as any).id}`} target="_blank">
                      <Hammer className="mr-2 h-4 w-4" /> Lançar obra
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild className={`cursor-pointer ${o.obraId == null ? "opacity-60 pointer-events-none" : ""}`}>
                    <Link href={o.obraId != null ? `/obras/${o.obraId}` : "#"} target={o.obraId != null ? "_blank" : undefined}>
                      <Hammer className="mr-2 h-4 w-4" /> Visualizar obra
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className={`cursor-pointer ${isExcluido ? "text-emerald-700" : "text-red-700"}`} onSelect={() => {
                  setOrcamentoAlvo(o as any)
                  setModalOpen(true)
                }}>
                  {isExcluido ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Reativar orçamento</> : <><Trash2 className="mr-2 h-4 w-4" /> Excluir orçamento</>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
    }
  ]

"""

    render_start = -1
    for i in range(theme_end, len(lines)):
        if "return (" in lines[i] and "PageLayout" in lines[i+1]:
            render_start = i
            break
            
    if render_start == -1:
        for i in range(theme_end, len(lines)):
            if "  return (" in lines[i]:
                render_start = i
                break
            
    # Wait, the render block:
    # return (
    #   <PageLayout>
    #     ...
    #   </PageLayout>
    # )
    
    new_render = """  return (
    <div className="flex h-full flex-col bg-[#F7F4EE]">
      <PageShell
        title="Orçamentos"
        count={total}
        actions={headerActions}
      >
        <div className="flex flex-col gap-4">
          <FilterToolbar
            search={
              <div className="relative w-full sm:max-w-[400px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Pesquisar por ID, cliente, obra ou telefone..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setNome(searchInput)
                      setPage(0)
                    }
                  }}
                  className="pl-9 pr-10 h-9 w-full bg-white transition-all shadow-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => { setSearchInput(""); setNome(""); setPage(0) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            }
            actions={
              <FilterCard
                value={{
                  q: nome,
                  telefone,
                  bairro,
                  tipoObraId,
                  ini: dataIni ? dataIni.toISOString().slice(0, 10) : undefined,
                  fim: dataFim ? dataFim.toISOString().slice(0, 10) : undefined,
                  pageSize: perPage as any,
                  statusExcluido,
                } as any}
                onChange={(next) => {
                  const v = next as any
                  setNome(v.q ?? "")
                  setSearchInput(v.q ?? "")
                  setTelefone(v.telefone ?? "")
                  setBairro(v.bairro ?? "")
                  setTipoObraId(v.tipoObraId ?? null)
                  if (v.pageSize) setPerPage(Number(v.pageSize))
                  setDataIni(v.ini ? new Date(v.ini) : undefined)
                  setDataFim(v.fim ? new Date(v.fim) : undefined)
                  if (v.statusExcluido === "excluidos" || v.statusExcluido === "todos") {
                    setStatusExcluido(v.statusExcluido)
                  } else {
                    setStatusExcluido("ativos")
                  }
                  setPage(0)
                }}
                onApply={() => consultar()}
                onClear={() => { limparFiltros(); consultar() }}
                tipoObraOptions={tiposOpts}
                pageSizeOptions={[10, 20, 25, 50, 100]}
                loading={loadingTabela}
              />
            }
          />
          
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            loading={loadingTabela}
            onRowClick={(r) => router.push(`/orcamento/detalhes/${r.id}`)}
            pagination={{
              page: page + 1,
              perPage,
              total,
              onPageChange: (p) => setPage(p - 1),
              perPageOptions: [10, 20, 25, 50, 100],
            }}
          />
        </div>
      </PageShell>
      
      {modalOpen && (
        <ExcluirModalOrcamento
          open={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setOrcamentoAlvo(null)
          }}
          orcamentoId={orcamentoAlvo?.id ?? null}
          isExcluido={!!orcamentoAlvo?.excluido}
          onFinished={() => consultar()}
        />
      )}
    </div>
  )
}
"""

    
    final_lines = []
    final_lines.extend(lines[:imp_start])
    final_lines.append(new_imports)
    final_lines.extend(lines[imp_end+1:const_start])
    if const_start != -1 and const_end != -1:
        final_lines.extend(lines[const_end:col_start])
    else:
        final_lines.extend(lines[imp_end+1:col_start])
        
    final_lines.append(new_columns)
    
    if render_start != -1:
        final_lines.extend(lines[theme_end:render_start])
        final_lines.append(new_render)
    else:
        print("ERROR: Could not find render block")
        
    # We must add import for X icon if it is not there
    has_x_icon = any("lucide-react" in l and "X," in l for l in final_lines)
    if not has_x_icon:
        for i, l in enumerate(final_lines):
            if "import { EllipsisVertical" in l:
                final_lines[i] = l.replace("Search }", "Search, X }")
                break

    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(final_lines)

    print("Success")

rewrite()
