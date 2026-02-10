"use client";

import * as React from "react";
import { Check, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

type ColorKey =
  | "gray" | "zinc" | "slate" | "neutral" | "stone"
  | "red" | "orange" | "amber" | "yellow"
  | "lime" | "green" | "emerald" | "teal" | "cyan"
  | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose"
  | "black";

export type StatusOption<TValue extends string = string> = {
  label: string;
  value: TValue;
  color: ColorKey;
  icon?: LucideIcon;
};

type Size = "sm" | "md" | "lg";
type Mode = "static" | "dynamic";
type StaticVariant = "text" | "pill" | "badge";

export type StatusSelectProps<TValue extends string = string> = {
  options: ReadonlyArray<StatusOption<TValue>>;
  value?: TValue | null;
  onChange?: (v: TValue) => void;
  mode?: Mode;
  staticVariant?: StaticVariant;
  placeholder?: string;
  size?: Size;
  disabled?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
};

const COLOR_STYLES: Record<
  ColorKey,
  {
    bg: string;
    bgHover: string;
    ring: string;
    text: string;
    dot: string;
  }
> = {
  gray: { bg: "bg-gray-100", bgHover: "hover:bg-gray-200", ring: "ring-gray-500/20", text: "text-gray-700", dot: "bg-gray-500" },
  zinc: { bg: "bg-zinc-100", bgHover: "hover:bg-zinc-200", ring: "ring-zinc-500/20", text: "text-zinc-700", dot: "bg-zinc-500" },
  slate: { bg: "bg-slate-100", bgHover: "hover:bg-slate-200", ring: "ring-slate-500/20", text: "text-slate-700", dot: "bg-slate-500" },
  neutral: { bg: "bg-neutral-100", bgHover: "hover:bg-neutral-200", ring: "ring-neutral-500/20", text: "text-neutral-700", dot: "bg-neutral-500" },
  stone: { bg: "bg-stone-100", bgHover: "hover:bg-stone-200", ring: "ring-stone-500/20", text: "text-stone-700", dot: "bg-stone-500" },

  red: { bg: "bg-red-50", bgHover: "hover:bg-red-100", ring: "ring-red-600/20", text: "text-red-700", dot: "bg-red-500" },
  orange: { bg: "bg-orange-50", bgHover: "hover:bg-orange-100", ring: "ring-orange-600/20", text: "text-orange-700", dot: "bg-orange-500" },
  amber: { bg: "bg-amber-50", bgHover: "hover:bg-amber-100", ring: "ring-amber-500/20", text: "text-amber-700", dot: "bg-amber-500" },
  yellow: { bg: "bg-yellow-50", bgHover: "hover:bg-yellow-100", ring: "ring-yellow-400/20", text: "text-yellow-700", dot: "bg-yellow-500" },

  lime: { bg: "bg-lime-50", bgHover: "hover:bg-lime-100", ring: "ring-lime-600/20", text: "text-lime-700", dot: "bg-lime-500" },
  green: { bg: "bg-green-50", bgHover: "hover:bg-green-100", ring: "ring-green-600/20", text: "text-green-700", dot: "bg-green-500" },
  emerald: { bg: "bg-emerald-50", bgHover: "hover:bg-emerald-100", ring: "ring-emerald-600/20", text: "text-emerald-700", dot: "bg-emerald-500" },
  teal: { bg: "bg-teal-50", bgHover: "hover:bg-teal-100", ring: "ring-teal-600/20", text: "text-teal-700", dot: "bg-teal-500" },
  cyan: { bg: "bg-cyan-50", bgHover: "hover:bg-cyan-100", ring: "ring-cyan-600/20", text: "text-cyan-700", dot: "bg-cyan-500" },

  sky: { bg: "bg-sky-50", bgHover: "hover:bg-sky-100", ring: "ring-sky-600/20", text: "text-sky-700", dot: "bg-sky-500" },
  blue: { bg: "bg-blue-50", bgHover: "hover:bg-blue-100", ring: "ring-blue-600/20", text: "text-blue-700", dot: "bg-blue-500" },
  indigo: { bg: "bg-indigo-50", bgHover: "hover:bg-indigo-100", ring: "ring-indigo-600/20", text: "text-indigo-700", dot: "bg-indigo-500" },
  violet: { bg: "bg-violet-50", bgHover: "hover:bg-violet-100", ring: "ring-violet-600/20", text: "text-violet-700", dot: "bg-violet-500" },
  purple: { bg: "bg-purple-50", bgHover: "hover:bg-purple-100", ring: "ring-purple-600/20", text: "text-purple-700", dot: "bg-purple-500" },
  fuchsia: { bg: "bg-fuchsia-50", bgHover: "hover:bg-fuchsia-100", ring: "ring-fuchsia-600/20", text: "text-fuchsia-700", dot: "bg-fuchsia-500" },
  pink: { bg: "bg-pink-50", bgHover: "hover:bg-pink-100", ring: "ring-pink-600/20", text: "text-pink-700", dot: "bg-pink-500" },
  rose: { bg: "bg-rose-50", bgHover: "hover:bg-rose-100", ring: "ring-rose-600/20", text: "text-rose-700", dot: "bg-rose-500" },

  black: { bg: "bg-neutral-900", bgHover: "hover:bg-neutral-800", ring: "ring-neutral-900/10", text: "text-white", dot: "bg-white" },
};

function getStyles(color?: ColorKey) {
  return color ? COLOR_STYLES[color] : COLOR_STYLES.neutral;
}

function useSelected<T extends string>(opts: ReadonlyArray<StatusOption<T>>, value?: T | null) {
  return React.useMemo(
    () => opts.find(o => o.value === value) ?? null,
    [opts, value]
  );
}

function Pill({
  label,
  icon: Icon,
  color,
  size = "md",
  className,
}: {
  label: string;
  icon?: LucideIcon;
  color: ColorKey;
  size?: Size;
  className?: string;
}) {
  const s = getStyles(color);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full ring-1 border shadow-xs transition-all",
        s.bg, s.ring, s.text,
        "border-transparent", // Ensure border doesn't conflict with ring
        size === "sm" ? "px-2.5 py-0.5 text-xs font-medium" :
          size === "lg" ? "px-4 py-1.5 text-sm font-semibold" :
            "px-3 py-1 text-sm font-medium",
        className
      )}
    >
      {Icon ? <Icon className={cn("mr-1.5 opacity-80", size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5")} /> : null}
      {label}
    </span>
  );
}

function Badge({
  label,
  icon: Icon,
  color,
  size = "md",
  className,
}: {
  label: string;
  icon?: LucideIcon;
  color: ColorKey;
  size?: Size;
  className?: string;
}) {
  const s = getStyles(color);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border",
        s.bg, s.text, "border-transparent",
        size === "sm" ? "px-2 py-0.5 text-xs font-semibold" :
          size === "lg" ? "px-3 py-1 text-sm font-bold" :
            "px-2.5 py-0.5 text-sm font-semibold",
        className
      )}
    >
      {Icon ? <Icon className={cn("mr-1.5", size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5")} /> : null}
      {label}
    </span>
  );
}

function TextColored({
  label,
  color,
  className,
}: {
  label: string;
  color: ColorKey;
  className?: string;
}) {
  const s = getStyles(color);
  return <span className={cn("font-semibold", s.text, className)}>{label}</span>;
}

export function StatusSelect<TValue extends string = string>({
  options,
  value,
  onChange,
  mode = "dynamic",
  staticVariant = "pill",
  placeholder = "Selecionar status...",
  size = "md",
  disabled,
  className,
  align = "start",
}: StatusSelectProps<TValue>) {
  const selected = useSelected(options, value as TValue | null);
  const [open, setOpen] = React.useState(false);

  if (mode === "static") {
    if (!selected) return (
      <span className="text-muted-foreground text-sm italic">—</span>
    );

    if (staticVariant === "badge") {
      return <Badge label={selected.label} icon={selected.icon} color={selected.color} size={size} className={className} />;
    }

    return staticVariant === "pill" ? (
      <Pill label={selected.label} icon={selected.icon} color={selected.color} size={size} className={className} />
    ) : (
      <TextColored label={selected.label} color={selected.color} className={className} />
    );
  }

  const triggerStyles = selected ? getStyles(selected.color) : getStyles("neutral");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          className={cn(
            "w-fit justify-start rounded-xl ring-1 shadow-sm border-0",
            "transition-all active:scale-[0.98]",
            // If selected, use colored background (lighter). If not, use standard 'outline' look
            selected ? [triggerStyles.bg, triggerStyles.text, triggerStyles.ring, triggerStyles.bgHover] : "bg-white text-muted-foreground ring-input hover:bg-zinc-50 hover:text-foreground",
            size === "sm" ? "px-3 py-1.5 text-xs h-8" :
              size === "lg" ? "px-5 py-2.5 text-sm h-11" :
                "px-4 py-2 text-sm h-9",
            className
          )}
          variant="ghost"
        >
          {selected?.icon ? (
            <selected.icon className={cn("mr-2", size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-4 w-4" : "h-4 w-4")} />
          ) : null}
          <span className="truncate font-medium">
            {selected ? selected.label : placeholder}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className="w-[240px] p-0 rounded-xl overflow-hidden shadow-lg border-border/50"
      >
        <Command className="bg-white">
          <CommandInput placeholder="Pesquisar status..." className="h-9" />
          <CommandList>
            <CommandEmpty>Sem resultados.</CommandEmpty>
            <CommandGroup className="p-1.5">
              {options.map((opt) => {
                const styles = getStyles(opt.color);
                const Icon = opt.icon;
                const active = opt.value === value;
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onChange?.(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "cursor-pointer rounded-lg px-2 py-1.5 mb-0.5 last:mb-0",
                      active ? "bg-zinc-100 text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <span className={cn("mr-2 h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-black/10", styles.dot)} />
                    {Icon ? <Icon className="mr-2 h-4 w-4 opacity-70" /> : null}
                    <span className="flex-1 truncate font-medium">{opt.label}</span>
                    {active ? <Check className="h-3.5 w-3.5 opacity-100 text-marromEscuro" /> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
