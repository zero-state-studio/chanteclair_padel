import type { Genere } from "@/types";

export const GENERE_COLOR: Record<Genere, string> = {
  MASCHILE: "var(--color-blue)",
  FEMMINILE: "var(--color-pink)",
  MISTO: "var(--color-yellow)",
};

export const GENERE_LABEL: Record<Genere, string> = {
  MASCHILE: "Maschile",
  FEMMINILE: "Femminile",
  MISTO: "Misto",
};

export const GENERE_LABEL_SHORT: Record<Genere, string> = {
  MASCHILE: "M",
  FEMMINILE: "F",
  MISTO: "X",
};

export function genereAccent(g: Genere) {
  return GENERE_COLOR[g];
}

export function genereBorderStyle(g: Genere, active = true) {
  return active
    ? { borderColor: GENERE_COLOR[g], borderLeftWidth: 4 }
    : { borderLeftWidth: 4, borderLeftColor: GENERE_COLOR[g] };
}

export function genereChipStyle(g: Genere) {
  return {
    backgroundColor: `color-mix(in oklch, ${GENERE_COLOR[g]} 22%, transparent)`,
    color: GENERE_COLOR[g],
    border: `1px solid ${GENERE_COLOR[g]}`,
  };
}
