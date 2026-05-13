import { describe, it, expect } from "vitest";
import { distribuisciGironi1 } from "./gironi";
import type { Team } from "@prisma/client";

function mkTeam(id: string, livello = 0): Team {
  return {
    id,
    nome: `Squadra ${id}`,
    genere: "MASCHILE",
    livello,
    player1Id: `p1-${id}`,
    player2Id: `p2-${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("distribuisciGironi1", () => {
  it("creates exactly 12 groups", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const gironi = distribuisciGironi1(squadre);
    expect(gironi).toHaveLength(12);
  });

  it("each group has 3 slots", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const gironi = distribuisciGironi1(squadre);
    for (const g of gironi) {
      expect(g.teams).toHaveLength(3);
    }
  });

  it("with fewer than 36 teams, missing slots are filled with null teamId", () => {
    const squadre = Array.from({ length: 30 }, (_, i) => mkTeam(String(i)));
    const gironi = distribuisciGironi1(squadre);
    expect(gironi).toHaveLength(12);
    const allSlots = gironi.flatMap((g) => g.teams);
    expect(allSlots.filter((s) => s.teamId === null)).toHaveLength(6);
    expect(allSlots.filter((s) => s.teamId !== null)).toHaveLength(30);
  });

  it("each real team appears exactly once", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(`t${i}`));
    const gironi = distribuisciGironi1(squadre);
    const ids = gironi
      .flatMap((g) => g.teams.map((t) => t.teamId))
      .filter((x): x is string => x !== null);
    expect(new Set(ids).size).toBe(36);
  });

  it("group names are A..L", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const gironi = distribuisciGironi1(squadre);
    expect(gironi.map((g) => g.nome)).toEqual([
      "A","B","C","D","E","F","G","H","I","J","K","L",
    ]);
  });

  it("throws on more than 36 teams", () => {
    const squadre = Array.from({ length: 37 }, (_, i) => mkTeam(String(i)));
    expect(() => distribuisciGironi1(squadre)).toThrow(/massimo 36/i);
  });

  it("throws on fewer than 2 teams", () => {
    expect(() => distribuisciGironi1([mkTeam("a")])).toThrow(/almeno 2/i);
  });
});
