"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Filter, MinusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, type MotionProps } from "motion/react"
import { Switch } from "@/components/ui/switch"

export type FilterStateClientes = {
    q?: string
    telefone?: string
    bairro?: string
    cidadeId?: string
    temObras?: boolean
    temOrcamentos?: boolean
    pageSize?: 10 | 20 | 25 | 50 | 100
}

export type FilterCardClientesProps = {
    value: FilterStateClientes
    onChange: (next: FilterStateClientes) => void
    onApply?: () => void
    onClear?: () => void
    pageSizeOptions?: number[]
    loading?: boolean
    className?: string
    listaCidades?: { id: number; nome: string }[]
}

export default function FilterCardClientes({
    value,
    onChange,
    onApply,
    onClear,
    pageSizeOptions = [10, 20, 25, 50, 100],
    loading,
    className,
    listaCidades = [],
}: FilterCardClientesProps) {
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState<FilterStateClientes>(value)

    useEffect(() => {
        if (open) setDraft(value)
    }, [open, value]) // Added value dependency to sync if parent changes

    const smooth: MotionProps = {
        initial: { opacity: 0, scale: 0.98, y: 4 },
        animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18 } },
        exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.12 } },
    }

    function applyAndClose() {
        onChange({ ...value, ...draft })
        onApply?.()
        setOpen(false)
    }

    function clearAll() {
        onChange({
            q: "",
            telefone: "",
            bairro: "",
            cidadeId: "0",
            temObras: false,
            temOrcamentos: false,
            pageSize: undefined,
        })
        onClear?.()
        setOpen(false)
    }

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="success" className="gap-2">
                        <Filter className="h-4 w-4" />
                        filtros
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="start"
                    sideOffset={8}
                    className={cn(
                        "w-[360px] p-3 sm:w-[400px] shadow-lg",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                    )}
                >
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div key="body" layout {...smooth} className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-sm">Cliente (Nome)</Label>
                                <Input
                                    className="h-9"
                                    placeholder="Ex: Maria"
                                    value={draft.q ?? ""}
                                    onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-sm">Telefone</Label>
                                <Input
                                    className="h-9"
                                    placeholder="DDD + Número"
                                    value={draft.telefone ?? ""}
                                    onChange={(e) => setDraft({ ...draft, telefone: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-sm">Bairro</Label>
                                    <Input
                                        className="h-9"
                                        placeholder="Bairro"
                                        value={draft.bairro ?? ""}
                                        onChange={(e) => setDraft({ ...draft, bairro: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-sm">Cidade</Label>
                                    <Select
                                        value={draft.cidadeId ? String(draft.cidadeId) : "0"}
                                        onValueChange={(v) => setDraft({ ...draft, cidadeId: v === "0" ? undefined : v })}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Todas" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            <SelectItem value="0">Todas</SelectItem>
                                            {listaCidades?.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-2">
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="tem-obras" className="text-sm">Com Obras?</Label>
                                    <Switch
                                        id="tem-obras"
                                        checked={!!draft.temObras}
                                        onCheckedChange={(checked) => setDraft({ ...draft, temObras: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="tem-orcamentos" className="text-sm">Com Orçamentos?</Label>
                                    <Switch
                                        id="tem-orcamentos"
                                        checked={!!draft.temOrcamentos}
                                        onCheckedChange={(checked) => setDraft({ ...draft, temOrcamentos: checked })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-sm">Linhas por página</Label>
                                <Select
                                    value={draft.pageSize ? String(draft.pageSize) : ""}
                                    onValueChange={(v) =>
                                        setDraft({
                                            ...draft,
                                            pageSize: (Number(v) as FilterStateClientes["pageSize"]) || undefined,
                                        })
                                    }
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Selecionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pageSizeOptions.map((n) => (
                                            <SelectItem key={n} value={String(n)}>
                                                {n}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <Button variant="ghost" className="text-green" onClick={() => setOpen(false)}>
                                    cancelar
                                </Button>
                                <Button variant="outline" onClick={applyAndClose} disabled={loading} className="text-white border-green bg-green">
                                    aplicar
                                </Button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </PopoverContent>
            </Popover>

            <Button
                type="button"
                variant="outlined-bege"
                disabled={loading}
                onClick={clearAll}
                className="gap-2 text-green border-green"
            >
                <MinusCircle className="h-4 w-4" />
                limpar filtros
            </Button>
        </div>
    )
}
