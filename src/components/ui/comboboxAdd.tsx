"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type ComboItem = { value: string; label: string }

/**
 * Variantes de cor do botão/trigger do combobox:
 * - "white-brown" (default): bg branco + texto marrom-escuro
 * - "gray-green": bg-cinza + texto verde
 * - "gray-brown": bg-cinza + texto marrom-escuro
 * - "white-green": bg branco + texto verde
 */
type ColorVariant = "white-brown" | "gray-green" | "gray-brown" | "white-green"

type Props = {
  items: ComboItem[]
  placeholder?: string
  buttonText?: string
  widthClass?: string
  disabled?: boolean
  onSelect: (value: string) => void
  showEmptyOption?: boolean
  emptyLabel?: string
  /** Controla as cores do botão gatilho (default: "white-brown"). */
  colorVariant?: ColorVariant
  /** Permite sobrescrever classes do botão, se precisar. */
  buttonClassName?: string
}

const variantToClasses: Record<ColorVariant, string> = {
  "white-brown": "bg-white text-marromEscuro",
  "gray-green": "bg-cinza text-green",
  "gray-brown": "bg-cinza text-marromEscuro",
  "white-green": "bg-white text-green",
}

export function ComboboxAdd({
  items,
  placeholder = "Buscar...",
  buttonText = "+ Adicionar",
  widthClass = "w-52",
  disabled = false,
  onSelect,
  showEmptyOption = true,
  emptyLabel = "(linha vazia)",
  colorVariant = "white-brown",
  buttonClassName,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState<string>("")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            widthClass,
            "h-8 text-xs justify-between rounded-xl border-0 px-3",
            "focus-visible:ring-2 focus-visible:ring-marromEscuro focus-visible:outline-none",
            variantToClasses[colorVariant],
            buttonClassName
          )}
        >
          {buttonText}
          <ChevronsUpDown className="opacity-50 h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className={cn(widthClass, "p-0")}>
        <Command>
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
            <CommandGroup>
              {showEmptyOption && (
                <CommandItem
                  value="vazio"
                  onSelect={() => {
                    onSelect("vazio")
                    setValue("")
                    setOpen(false)
                  }}
                >
                  {emptyLabel}
                  <Check className={cn("ml-auto opacity-100 h-4 w-4")} />
                </CommandItem>
              )}

              {items.map((it) => (
                <CommandItem
                  key={it.value}
                  value={it.value}
                  onSelect={(v) => {
                    setValue(v)
                    onSelect(v)
                    setOpen(false)
                    setValue("") // reset visual
                  }}
                >
                  {it.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === it.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
