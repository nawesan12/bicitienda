"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/bt";

/** "Últimos 7 días ▾" de 3a: cambia el rango y navega (sin botón). */
export function RangeSelect({ value, hrefs }: { value: string; hrefs: Record<string, string> }) {
  const router = useRouter();
  return (
    <div className="w-[172px] flex-none">
      <Select
        aria-label="Rango de fechas"
        surface="panel"
        size="sm"
        value={value}
        onChange={(e) => router.push(hrefs[e.target.value], { scroll: false })}
        className="font-semibold"
      >
        <option value="7">Últimos 7 días</option>
        <option value="30">Últimos 30 días</option>
        <option value="todo">Todos</option>
      </Select>
    </div>
  );
}
