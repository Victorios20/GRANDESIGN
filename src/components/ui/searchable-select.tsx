"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface SearchableSelectItem {
    value: string
    label: string
}

interface Props {
    value: string
    onValueChange: (value: string) => void
    items: SearchableSelectItem[]
    placeholder: string
    searchPlaceholder?: string
    emptyMessage?: string
    className?: string
    disabled?: boolean
}

export function SearchableSelect({
    value,
    onValueChange,
    items,
    placeholder,
    searchPlaceholder = "Buscar...",
    emptyMessage = "Nenhum item encontrado.",
    className,
    disabled = false,
}: Props) {
    const [open, setOpen] = React.useState(false)
    const selectedItem = items.find((item) => item.value === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "h-10 w-full justify-between rounded-lg border-[#d9d3c8] bg-white px-3 text-sm font-normal text-[#2C201B] hover:bg-white",
                        !selectedItem && "text-[#8a7d69]",
                        className
                    )}
                >
                    <span className="truncate">{selectedItem?.label ?? placeholder}</span>
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] border-[#d9d3c8] bg-white p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} className="text-sm" />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.value}
                                    value={`${item.label} ${item.value}`}
                                    onSelect={() => {
                                        onValueChange(item.value)
                                        setOpen(false)
                                    }}
                                >
                                    <span className="truncate">{item.label}</span>
                                    <Check className={cn("ml-auto size-4", value === item.value ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
