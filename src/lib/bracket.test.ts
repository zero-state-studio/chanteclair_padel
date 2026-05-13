import { describe, it, expect } from "vitest";
import { generaFinali } from "./bracket";

describe("generaFinali", () => {
  it("produces exactly 4 match drafts: 2 semi + final + 3rd-place playoff", () => {
    const teamIds = ["t1", "t2", "t3", "t4"];
    const drafts = generaFinali(teamIds, "torneo-x", "GOLD");
    expect(drafts).toHaveLength(4);
    const semi = drafts.filter((d) => d.round === 2);
    const finals = drafts.filter((d) => d.round === 1);
    expect(semi).toHaveLength(2);
    expect(finals).toHaveLength(2);
  });

  it("semis have both team slots populated, finals have nulls", () => {
    const drafts = generaFinali(["a","b","c","d"], "t", "SILVER");
    const semis = drafts.filter((d) => d.round === 2);
    expect(semis.every((d) => d.team1Id !== null && d.team2Id !== null)).toBe(true);
    const finals = drafts.filter((d) => d.round === 1);
    expect(finals.every((d) => d.team1Id === null && d.team2Id === null)).toBe(true);
  });

  it("final at posizione 0, 3rd-place at posizione 1", () => {
    const drafts = generaFinali(["a","b","c","d"], "t", "BRONZE");
    const finale = drafts.find((d) => d.round === 1 && d.posizione === 0);
    const terzo = drafts.find((d) => d.round === 1 && d.posizione === 1);
    expect(finale).toBeDefined();
    expect(terzo).toBeDefined();
  });

  it("all drafts carry the given bracketTipo and tournamentId", () => {
    const drafts = generaFinali(["a","b","c","d"], "torneo-id", "GOLD");
    expect(drafts.every((d) => d.bracketTipo === "GOLD")).toBe(true);
    expect(drafts.every((d) => d.tournamentId === "torneo-id")).toBe(true);
  });

  it("with fewer than 4 teams pads semis with nulls", () => {
    const drafts = generaFinali(["a","b"], "t", "GOLD");
    expect(drafts).toHaveLength(4);
    const semis = drafts.filter((d) => d.round === 2);
    const filledSlots = semis.flatMap((s) => [s.team1Id, s.team2Id]).filter((x) => x !== null);
    expect(filledSlots).toHaveLength(2);
  });

  it("throws if more than 4 teams", () => {
    expect(() => generaFinali(["a","b","c","d","e"], "t", "GOLD")).toThrow();
  });
});
