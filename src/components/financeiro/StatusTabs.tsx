"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type StatusTabItem<TValue extends string> = {
  value: TValue
  label: string
  count: number
}

type StatusTabsProps<TValue extends string> = {
  value: TValue
  items: Array<StatusTabItem<TValue>>
  onValueChange: (value: TValue) => void
}

export function StatusTabs<TValue extends string>({ value, items, onValueChange }: StatusTabsProps<TValue>) {
  return (
    <section>
      <Tabs value={value} onValueChange={(nextValue) => onValueChange(nextValue as TValue)} className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-none bg-transparent p-0">
          {items.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="group h-9 flex-none rounded-lg border border-[#ddd7cc] bg-white px-3 text-[#5b5347] shadow-none transition-colors hover:border-[#d4cbb9] hover:bg-[#f7f4ec] data-[state=active]:border-[#c9bea4] data-[state=active]:bg-[#faf3e0] data-[state=active]:text-[#2c201b]"
            >
              <span>{item.label}</span>
              <span className="rounded-md bg-[#f1ece2] px-1.5 py-0.5 text-[10px] font-semibold text-[#6f6556] transition-colors group-data-[state=active]:bg-[#393316] group-data-[state=active]:text-[#faf3e0]">
                {item.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </section>
  )
}
