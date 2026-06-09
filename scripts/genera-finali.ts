import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { computeStandings } from "../src/lib/gironi";
import { generaFinali } from "../src/lib/bracket";
import { publishLiveEvent } from "../src/lib/realtime";
import type { FinaliAnimationEvent, Genere } from "../src/types";

type Categoria = "GOLD" | "SILVER" | "BRONZE";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function generaPerTorneo(tournamentId: string) {
  const torneo = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      groups: {
        where: { fase: 2 },
        include: { groupTeams: { include: { team: true } } },
        orderBy: { posizione: "asc" },
      },
      matches: true,
    },
  });
  if (!torneo) throw new Error("Torneo non trovato");
  if (torneo.fase !== "GIRONI_2")
    throw new Error(`Fase non GIRONI_2 (è ${torneo.fase})`);

  const phase2GroupIds = new Set(torneo.groups.map((g) => g.id));
  const fase2Matches = torneo.matches.filter(
    (m) => m.groupId !== null && phase2GroupIds.has(m.groupId!) && m.round === 0
  );
  const incompleti = fase2Matches.filter((m) => m.stato !== "COMPLETATA");
  if (incompleti.length > 0)
    throw new Error(`Mancano ${incompleti.length} partite fase 2`);

  const primaPerCategoria: Record<Categoria, string[]> = {
    GOLD: [],
    SILVER: [],
    BRONZE: [],
  };
  const standingsUpdates: { id: string; posizioneFinale: number }[] = [];

  for (const group of torneo.groups) {
    const groupMatchesG = fase2Matches.filter((m) => m.groupId === group.id);
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
    }
    const primo = standings.find((s) => s.posizione === 1);
    const categoria = group.bracketTipo as Categoria | null;
    if (primo && categoria) {
      primaPerCategoria[categoria].push(primo.teamId);
    }
  }

  const allDrafts = (["GOLD", "SILVER", "BRONZE"] as const).flatMap((cat) => {
    const teams = shuffle(primaPerCategoria[cat]);
    if (teams.length === 0) return [];
    return generaFinali(teams, torneo.id, cat);
  });

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
      if (allDrafts.length > 0) {
        await tx.match.createMany({ data: allDrafts });
      }
      await tx.tournament.update({
        where: { id: torneo.id },
        data: { fase: "FINALI" },
      });
    },
    { maxWait: 10000, timeout: 30000 }
  );

  return { genere: torneo.genere as Genere };
}

async function main() {
  const tornei = await prisma.tournament.findMany({
    where: { fase: "GIRONI_2" },
    select: { id: true, nome: true, genere: true },
  });
  if (tornei.length === 0) {
    console.log("Nessun torneo in GIRONI_2.");
    return;
  }
  for (const t of tornei) {
    console.log(`Genero finali per ${t.nome} (${t.genere})...`);
    const { genere } = await generaPerTorneo(t.id);
    console.log("  finali create, fase = FINALI.");

    const event: FinaliAnimationEvent = {
      tipo: "FINALI_ANIMATION",
      genere,
      tournamentId: t.id,
    };
    try {
      await publishLiveEvent(event);
      console.log("  evento FINALI_ANIMATION pubblicato.");
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
