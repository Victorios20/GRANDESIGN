"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { CalendarIcon, Users } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ComboboxAdd } from "@/components/ui/comboboxAdd"
import { cn } from "@/lib/utils"

type Option = { value: string; label: string }

export type ExecucaoVM = {
  equipeId?: number | null
  dataPrevInicio?: Date | null
  dataPrevConclusao?: Date | null
}

type Props = {
  value: ExecucaoVM
  onChange: (patch: Partial<ExecucaoVM>) => void
  isEditing: boolean
  equipeOptions?: Option[]
  className?: string
}

const labelText = "text-neutral-700 text-sm font-medium"
const valueText = "text-neutral-800 text-sm font-normal tabular-nums tracking-tight"

const inputGrayGreen =
  "h-9 border border-green/40 bg-cinza text-green rounded-xl px-3 focus-visible:ring-2 focus-visible:ring-green focus-visible:outline-none"

function DateField({
  id,
  label,
  date,
  onSelect,
  disabled,
}: {
  id: string
  label: string
  date: Date | null | undefined
  onSelect: (d: Date | undefined) => void
  disabled?: boolean
}) {
  const text = useMemo(() => (date ? format(date, "dd/MM/yyyy") : "Selecionar…"), [date])

  return (
    <div className="flex items-center gap-0.5">
      <Label htmlFor={id} className={cn("shrink-0 w-40", labelText)}>
        {label}
      </Label>
      <input id={id} className="sr-only" aria-hidden readOnly />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(inputGrayGreen, "w-48 justify-between font-semibold", disabled && "pointer-events-none")}
          >
            {text}
            <CalendarIcon className="ml-2 h-4 w-4 opacity-70 text-green" />
          </Button>
        </PopoverTrigger>
        {!disabled && (
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              selected={date ?? undefined}
              onSelect={onSelect}
              colorVariant="gray-green"
            />
          </PopoverContent>
        )}
      </Popover>
    </div>
  )
}

export default function Execucao({
  value,
  onChange,
  isEditing,
  equipeOptions = [],
  className,
}: Props) {
  const patch = (p: Partial<ExecucaoVM>) => onChange({ ...value, ...p })

  const equipeButtonText =
    (equipeOptions.find((o) => String(o.value) === String(value.equipeId))?.label as string) || "Selecione"

  return (
    <Card className={cn("rounded-2xl shadow-md bg-white border-0", className)} id="execucao">
      <CardContent className="p-6">
        <h3 className="text-2xl font-semibold text-green mb-4 flex items-center gap-2">
          <Users className="h-6 w-6 text-green" />
          Execução
        </h3>

        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center gap-0.5">
            <Label htmlFor="exec.equipeId" className={cn("shrink-0 w-40", labelText)}>
              Equipe
            </Label>
            <input id="exec.equipeId" className="sr-only" aria-hidden readOnly />
            {isEditing ? (
              <div className="w-64">
                <ComboboxAdd
                  widthClass="w-full"
                  placeholder="Selecionar…"
                  buttonText={equipeButtonText}
                  items={equipeOptions}
                  onSelect={(v) => patch({ equipeId: v ? Number(v) : null })}
                  showEmptyOption={false}
                  colorVariant="gray-green"
                />
              </div>
            ) : (
              <span className={cn(valueText, "inline-block w-64")}>
                {equipeButtonText !== "Selecione" ? equipeButtonText : "-"}
              </span>
            )}
          </div>

          <DateField
            id="exec.dataPrevInicio"
            label="Data prevista de início"
            date={value.dataPrevInicio ?? null}
            onSelect={(d) => patch({ dataPrevInicio: d ?? null })}
            disabled={!isEditing}
          />

          <DateField
            id="exec.dataPrevConclusao"
            label="Data prevista de conclusão"
            date={value.dataPrevConclusao ?? null}
            onSelect={(d) => patch({ dataPrevConclusao: d ?? null })}
            disabled={!isEditing}
          />
        </div>
      </CardContent>
    </Card>
  )
}
