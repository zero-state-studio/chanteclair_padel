import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  assegnaCategorie,
  computeStandings,
  distribuisciGironi2,
  generaMatchGironi1,
} from "../src/lib/gironi";
import { publishLiveEvent } from "../src/lib/realtime";
import type { Genere, GironiAnimationEvent } from "../src/types";

async function recomputeGroupStats(
  tx: import("@prisma/client").Prisma.TransactionClient,
  groupId: string
) {
  const groupTeams = await tx.groupTeam.findMany({ where: { groupId } });
  const matches = await tx.match.findMany({
    where: { groupId, stato: "COMPLETATA" },
  });
  for (const gt of groupTeams) {
    let punti = 0,
      gv = 0,
      gp = 0,
      n = 0;
    for (const m of matches) {
      const isT1 = m.team1Id === gt.teamId;
      const isT2 = m.team2Id === gt.teamId;
      if (!isT1 && !isT2) continue;
      n++;
      const my = isT1 ? m.set1Team1 ?? 0 : m.set1Team2 ?? 0;
      const opp = isT1 ? m.set1Team2 ?? 0 : m.set1Team1 ?? 0;
      gv += my;
      gp += opp;
      if (m.winnerId === gt.teamId) punti += 2;
      else if (m.winnerId) punti += 1;
    }
    await tx.groupTeam.update({
      where: { id: gt.id },
      data: { punti, gameVinti: gv, gamePersi: gp, matchGiocate: n },
    });
  }
}

async function generaPerTorneo(tournamentId: string) {
  const torneo = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      groups: {
        where: { fase: 1 },
        include: { groupTeams: { include: { team: true } } },
        orderBy: { posizione: "asc" },
      },
      matches: true,
    },
  });

  if (!torneo) throw new Error("Torneo non trovato");
  if (torneo.fase !== "GIRONI_1")
    throw new Error(`Fase corrente non è GIRONI_1 (è ${torneo.fase})`);
  if (torneo.groups.length === 0) throw new Error("Nessun girone fase 1");

  const fase1Matches = torneo.matches.filter(
    (m) => m.groupId !== null && m.round === 0
  );
  const incompleti = fase1Matches.filter((m) => m.stato !== "COMPLETATA");
  if (incompleti.length > 0)
    throw new Error(`Mancano ${incompleti.length} partite fase 1`);

  type StandingForCategory = {
    groupPosizione: number;
    teamId: string;
    posizioneFinale: number;
  };
  const standingsAll: StandingForCategory[] = [];
  const standingsUpdates: { id: string; posizioneFinale: number }[] = [];

  for (const group of torneo.groups) {
    const groupMatchesG = fase1Matches.filter((m) => m.groupId === group.id);
    const standings = computeStandings(
      group.groupTeams.map((gt) => ({
        groupTeamId: gt.id,
        teamId: gt.teamId,
        punti: gt.punti,
        gameVinti: gt.gameVinti,
        gamePersi: gt.gamePersi,
        matchGiocate: gt.matchGiocate,
      })),
      groupMatchesG.map((m) => ({
        team1Id: m.team1Id ?? "",
        team2Id: m.team2Id ?? "",
        winnerId: m.winnerId,
      }))
    );
    for (const s of standings) {
      standingsUpdates.push({ id: s.groupTeamId, posizioneFinale: s.posizione });
      standingsAll.push({
        groupPosizione: group.posizione,
        teamId: s.teamId,
        posizioneFinale: s.posizione,
      });
    }
  }

  const categories = assegnaCategorie(standingsAll);
  const allTeamIds = [
    ...categories.GOLD,
    ...categories.SILVER,
    ...categories.BRONZE,
  ];
  const teamRows = await prisma.team.findMany({
    where: { id: { in: allTeamIds } },
  });
  const teamById = new Map(teamRows.map((t) => [t.id, t]));

  const goldTeams = categories.GOLD.map((id) => teamById.get(id)!).filter(Boolean);
  const silverTeams = categories.SILVER.map((id) => teamById.get(id)!).filter(Boolean);
  const bronzeTeams = categories.BRONZE.map((id) => teamById.get(id)!).filter(Boolean);

  const goldDraft = distribuisciGironi2(goldTeams, "GOLD", 100);
  const silverDraft = distribuisciGironi2(silverTeams, "SILVER", 200);
  const bronzeDraft = distribuisciGironi2(bronzeTeams, "BRONZE", 300);
  const allDrafts = [...goldDraft, ...silverDraft, ...bronzeDraft];
  const allMatchDrafts = generaMatchGironi1(allDrafts);

  await prisma.$transaction(
    async (tx) => {
      await Promise.all(
        standingsUpdates.map((u) =>
          tx.groupTeam.update({
            where: { id: u.id },
            data: { posizioneFinale: u.posizioneFinale },
          })
        )
      );

      const createdGroups = await Promise.all(
        allDrafts.map((g) =>
          tx.group.create({
            data: {
              tournamentId: torneo.id,
              nome: g.nome,
              posizione: g.posizione,
              fase: 2,
              bracketTipo: g.bracketTipo,
              groupTeams: {
                create: g.teams
                  .filter((t) => t.teamId !== null)
                  .map((t) => ({ teamId: t.teamId as string, seed: t.seed })),
              },
            },
            select: { id: true, posizione: true },
          })
        )
      );
      const groupIdByPos = new Map<number, string>(
        createdGroups.map((g) => [g.posizione, g.id])
      );

      if (allMatchDrafts.length > 0) {
        await tx.match.createMany({
          data: allMatchDrafts.map((m) => {
            const draft = allDrafts.find((d) => d.posizione === m.groupPosizione)!;
            return {
              tournamentId: torneo.id,
              groupId: groupIdByPos.get(m.groupPosizione)!,
              bracketTipo: draft.bracketTipo,
              round: 0,
              posizione: m.posizione,
              team1Id: m.team1Id,
              team2Id: m.team2Id,
              winnerId: m.winnerTeamId,
              set1Team1: m.set1Team1,
              set1Team2: m.set1Team2,
              punteggio:
                m.set1Team1 !== null && m.set1Team2 !== null
                  ? `${m.set1Team1}-${m.set1Team2}`
                  : null,
              stato: m.walkover ? "COMPLETATA" : "ATTESA",
              finitaAt: m.walkover ? new Date() : null,
            };
          }),
        });
      }

      for (const cg of createdGroups) {
        await recomputeGroupStats(tx, cg.id);
      }

      await tx.tournament.update({
        where: { id: torneo.id },
        data: { fase: "GIRONI_2" },
      });
    },
    { maxWait: 15000, timeout: 60000 }
  );

  return { genere: torneo.genere as Genere };
}

async function main() {
  const tornei = await prisma.tournament.findMany({
    where: { fase: "GIRONI_1" },
    select: { id: true, nome: true, genere: true },
  });

  if (tornei.length === 0) {
    console.log("Nessun torneo in fase GIRONI_1.");
    return;
  }

  for (const t of tornei) {
    console.log(`Genero fase 2 per ${t.nome} (${t.genere})...`);
    const { genere } = await generaPerTorneo(t.id);
    console.log("  fase 2 creata.");

    const event: GironiAnimationEvent = {
      tipo: "GIRONI_ANIMATION",
      genere,
      tournamentId: t.id,
    };
    try {
      await publishLiveEvent(event);
      console.log("  evento GIRONI_ANIMATION pubblicato.");
    } catch (err) {
      console.warn("  broadcast fallito:", (err as Error).message);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
