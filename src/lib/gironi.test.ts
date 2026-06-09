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
    const { gironi } = distribuisciGironi1(squadre);
    expect(gironi).toHaveLength(12);
  });

  it("each group has 3 slots", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const { gironi } = distribuisciGironi1(squadre);
    for (const g of gironi) {
      expect(g.teams).toHaveLength(3);
    }
  });

  it("with fewer than 36 teams, missing slots are filled with null teamId", () => {
    const squadre = Array.from({ length: 30 }, (_, i) => mkTeam(String(i)));
    const { gironi } = distribuisciGironi1(squadre);
    expect(gironi).toHaveLength(12);
    const allSlots = gironi.flatMap((g) => g.teams);
    expect(allSlots.filter((s) => s.teamId === null)).toHaveLength(6);
    expect(allSlots.filter((s) => s.teamId !== null)).toHaveLength(30);
  });

  it("each real team appears exactly once", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(`t${i}`));
    const { gironi } = distribuisciGironi1(squadre);
    const ids = gironi
      .flatMap((g) => g.teams.map((t) => t.teamId))
      .filter((x): x is string => x !== null);
    expect(new Set(ids).size).toBe(36);
  });

  it("group names are A..L", () => {
    const squadre = Array.from({ length: 36 }, (_, i) => mkTeam(String(i)));
    const { gironi } = distribuisciGironi1(squadre);
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

import { generaMatchGironi1 } from "./gironi";

describe("generaMatchGironi1", () => {
  it("girone of 3 real teams produces 3 matches, all ATTESA", () => {
    const gironi = [
      {
        nome: "A",
        posizione: 0,
        fase: 1,
        bracketTipo: null,
        teams: [
          { teamId: "t1", seed: null },
          { teamId: "t2", seed: null },
          { teamId: "t3", seed: null },
        ],
      },
    ];
    const matches = generaMatchGironi1(gironi);
    expect(matches).toHaveLength(3);
    expect(matches.every((m) => m.walkover === false)).toBe(true);
    expect(matches.every((m) => m.team1Id !== null && m.team2Id !== null)).toBe(true);
  });

  it("girone with 1 null slot produces 3 matches, 2 walkover", () => {
    const gironi = [
      {
        nome: "A",
        posizione: 0,
        fase: 1,
        bracketTipo: null,
        teams: [
          { teamId: "t1", seed: null },
          { teamId: "t2", seed: null },
          { teamId: null, seed: null },
        ],
      },
    ];
    const matches = generaMatchGironi1(gironi);
    expect(matches).toHaveLength(3);
    const walkovers = matches.filter((m) => m.walkover);
    expect(walkovers).toHaveLength(2);
    for (const w of walkovers) {
      expect(w.winnerTeamId).not.toBeNull();
      expect(w.set1Team1).toBeDefined();
      expect(w.set1Team2).toBeDefined();
    }
  });

  it("girone with 2 null slots: real team gets 2 walkover wins, null-vs-null skipped", () => {
    const gironi = [
      {
        nome: "A",
        posizione: 0,
        fase: 1,
        bracketTipo: null,
        teams: [
          { teamId: "t1", seed: null },
          { teamId: null, seed: null },
          { teamId: null, seed: null },
        ],
      },
    ];
    const matches = generaMatchGironi1(gironi);
    const walkovers = matches.filter((m) => m.walkover);
    expect(walkovers.length).toBeGreaterThanOrEqual(2);
    const nullVsNull = matches.filter(
      (m) => m.team1Id === null && m.team2Id === null
    );
    expect(nullVsNull).toHaveLength(0);
  });
});

import { assegnaCategorie, distribuisciGironi2 } from "./gironi";

describe("assegnaCategorie", () => {
  it("groups by posizioneFinale into GOLD/SILVER/BRONZE", () => {
    const standings = [
      { groupPosizione: 0, teamId: "tA1", posizioneFinale: 1 },
      { groupPosizione: 0, teamId: "tA2", posizioneFinale: 2 },
      { groupPosizione: 0, teamId: "tA3", posizioneFinale: 3 },
      { groupPosizione: 1, teamId: "tB1", posizioneFinale: 1 },
      { groupPosizione: 1, teamId: "tB2", posizioneFinale: 2 },
      { groupPosizione: 1, teamId: "tB3", posizioneFinale: 3 },
    ];
    const result = assegnaCategorie(standings);
    expect(result.GOLD).toEqual(["tA1", "tB1"]);
    expect(result.SILVER).toEqual(["tA2", "tB2"]);
    expect(result.BRONZE).toEqual(["tA3", "tB3"]);
  });

  it("ignores standings beyond position 3", () => {
    const standings = [
      { groupPosizione: 0, teamId: "t1", posizioneFinale: 1 },
      { groupPosizione: 0, teamId: "t4", posizioneFinale: 4 },
    ];
    const result = assegnaCategorie(standings);
    expect(result.GOLD).toEqual(["t1"]);
    expect(result.SILVER).toEqual([]);
    expect(result.BRONZE).toEqual([]);
  });
});

describe("distribuisciGironi2", () => {
  it("creates 4 groups of 3 for full category (12 teams)", () => {
    const teams = Array.from({ length: 12 }, (_, i) => mkTeam(`g${i}`));
    const gironi = distribuisciGironi2(teams, "GOLD", 0);
    expect(gironi).toHaveLength(4);
    for (const g of gironi) {
      expect(g.teams).toHaveLength(3);
      expect(g.bracketTipo).toBe("GOLD");
      expect(g.fase).toBe(2);
    }
  });

  it("group names start at posizione offset", () => {
    const teams = Array.from({ length: 12 }, (_, i) => mkTeam(`g${i}`));
    const gironi = distribuisciGironi2(teams, "SILVER", 4);
    expect(gironi.map((g) => g.posizione)).toEqual([4, 5, 6, 7]);
  });

  it("with fewer than 12 teams, pads with null slots", () => {
    const teams = Array.from({ length: 9 }, (_, i) => mkTeam(`g${i}`));
    const gironi = distribuisciGironi2(teams, "GOLD", 0);
    expect(gironi).toHaveLength(4);
    const allSlots = gironi.flatMap((g) => g.teams);
    expect(allSlots.filter((s) => s.teamId === null)).toHaveLength(3);
  });

  it("each real team appears once", () => {
    const teams = Array.from({ length: 12 }, (_, i) => mkTeam(`g${i}`));
    const gironi = distribuisciGironi2(teams, "BRONZE", 8);
    const ids = gironi
      .flatMap((g) => g.teams.map((t) => t.teamId))
      .filter((x): x is string => x !== null);
    expect(new Set(ids).size).toBe(12);
  });
});
