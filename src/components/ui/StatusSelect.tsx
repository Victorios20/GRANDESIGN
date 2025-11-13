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

type Size = "sm" | "md";
type Mode = "static" | "dynamic";
type StaticVariant = "text" | "pill";

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
  gray:    { bg: "bg-gray-700",    bgHover: "hover:bg-gray-600",    ring: "ring-gray-700/30",    text: "text-white", dot: "bg-gray-400" },
  zinc:    { bg: "bg-zinc-700",    bgHover: "hover:bg-zinc-600",    ring: "ring-zinc-700/30",    text: "text-white", dot: "bg-zinc-400" },
  slate:   { bg: "bg-slate-700",   bgHover: "hover:bg-slate-600",   ring: "ring-slate-700/30",   text: "text-white", dot: "bg-slate-400" },
  neutral: { bg: "bg-neutral-700", bgHover: "hover:bg-neutral-600", ring: "ring-neutral-700/30", text: "text-white", dot: "bg-neutral-400" },
  stone:   { bg: "bg-stone-700",   bgHover: "hover:bg-stone-600",   ring: "ring-stone-700/30",   text: "text-white", dot: "bg-stone-400" },

  red:     { bg: "bg-red-600",     bgHover: "hover:bg-red-500",     ring: "ring-red-600/30",     text: "text-white", dot: "bg-red-300" },
  orange:  { bg: "bg-orange-600",  bgHover: "hover:bg-orange-500",  ring: "ring-orange-600/30",  text: "text-white", dot: "bg-orange-300" },
  amber:   { bg: "bg-amber-500",   bgHover: "hover:bg-amber-400",   ring: "ring-amber-500/30",   text: "text-black", dot: "bg-amber-200" },
  yellow:  { bg: "bg-yellow-400",  bgHover: "hover:bg-yellow-300",  ring: "ring-yellow-400/30",  text: "text-black", dot: "bg-yellow-200" },

  lime:    { bg: "bg-lime-600",    bgHover: "hover:bg-lime-500",    ring: "ring-lime-600/30",    text: "text-white", dot: "bg-lime-300" },
  green:   { bg: "bg-green-600",   bgHover: "hover:bg-green-500",   ring: "ring-green-600/30",   text: "text-white", dot: "bg-green-300" },
  emerald: { bg: "bg-emerald-600", bgHover: "hover:bg-emerald-500", ring: "ring-emerald-600/30", text: "text-white", dot: "bg-emerald-300" },
  teal:    { bg: "bg-teal-600",    bgHover: "hover:bg-teal-500",    ring: "ring-teal-600/30",    text: "text-white", dot: "bg-teal-300" },
  cyan:    { bg: "bg-cyan-600",    bgHover: "hover:bg-cyan-500",    ring: "ring-cyan-600/30",    text: "text-white", dot: "bg-cyan-300" },

  sky:     { bg: "bg-sky-600",     bgHover: "hover:bg-sky-500",     ring: "ring-sky-600/30",     text: "text-white", dot: "bg-sky-300" },
  blue:    { bg: "bg-blue-600",    bgHover: "hover:bg-blue-500",    ring: "ring-blue-600/30",    text: "text-white", dot: "bg-blue-300" },
  indigo:  { bg: "bg-indigo-600",  bgHover: "hover:bg-indigo-500",  ring: "ring-indigo-600/30",  text: "text-white", dot: "bg-indigo-300" },
  violet:  { bg: "bg-violet-600",  bgHover: "hover:bg-violet-500",  ring: "ring-violet-600/30",  text: "text-white", dot: "bg-violet-300" },
  purple:  { bg: "bg-purple-600",  bgHover: "hover:bg-purple-500",  ring: "ring-purple-600/30",  text: "text-white", dot: "bg-purple-300" },
  fuchsia: { bg: "bg-fuchsia-600", bgHover: "hover:bg-fuchsia-500", ring: "ring-fuchsia-600/30", text: "text-white", dot: "bg-fuchsia-300" },
  pink:    { bg: "bg-pink-600",    bgHover: "hover:bg-pink-500",    ring: "ring-pink-600/30",    text: "text-white", dot: "bg-pink-300" },
  rose:    { bg: "bg-rose-600",    bgHover: "hover:bg-rose-500",    ring: "ring-rose-600/30",    text: "text-white", dot: "bg-rose-300" },

  black:   { bg: "bg-black",       bgHover: "hover:bg-black/90",    ring: "ring-black/30",       text: "text-white", dot: "bg-neutral-700" },
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
        "inline-flex items-center rounded-xl ring-1",
        s.bg, s.ring, s.text,
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
        className
      )}
    >
      {Icon ? <Icon className={cn("mr-1.5", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} /> : null}
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
  return <span className={cn("font-semibold", s.text.replace("text-", "text-"), className)}>{label}</span>;
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
      staticVariant === "pill"
        ? <span className="inline-block rounded-xl border px-3 py-1.5 text-sm text-muted-foreground">—</span>
        : <span className="text-muted-foreground">—</span>
    );

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
            "w-fit justify-start rounded-xl ring-1",
            "transition-colors",
            triggerStyles.bg, triggerStyles.text, triggerStyles.ring, triggerStyles.bgHover,
            size === "sm" ? "px-3 py-1.5 text-sm" : "px-3.5 py-2 text-sm",
            className
          )}
          variant="ghost"
        >
          {selected?.icon ? (
            <selected.icon className={cn("mr-2", size === "sm" ? "h-4 w-4" : "h-4 w-4")} />
          ) : null}
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className="w-[260px] p-0"
      >
        <Command>
          <CommandInput placeholder="Pesquisar status..." />
          <CommandList>
            <CommandEmpty>Sem resultados.</CommandEmpty>
            <CommandGroup>
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
                    className="cursor-pointer"
                  >
                    <span className={cn("mr-2 h-3 w-3 rounded-full", styles.dot)} />
                    {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {active ? <Check className="h-4 w-4 opacity-100" /> : <Check className="h-4 w-4 opacity-0" />}
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
