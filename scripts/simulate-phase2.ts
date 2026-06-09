import { prisma } from "../src/lib/prisma";

function randomScore(): {
  s1: number;
  s2: number;
  tb1: number | null;
  tb2: number | null;
  team1Wins: boolean;
} {
  const team1Wins = Math.random() < 0.5;
  const r = Math.random();
  let s1: number, s2: number;
  let tb1: number | null = null;
  let tb2: number | null = null;

  if (r < 0.6) {
    const loser = Math.floor(Math.random() * 5);
    s1 = team1Wins ? 6 : loser;
    s2 = team1Wins ? loser : 6;
  } else if (r < 0.85) {
    s1 = team1Wins ? 7 : 5;
    s2 = team1Wins ? 5 : 7;
  } else {
    s1 = team1Wins ? 7 : 6;
    s2 = team1Wins ? 6 : 7;
    const loserTb = Math.floor(Math.random() * 6);
    tb1 = team1Wins ? 7 : loserTb;
    tb2 = team1Wins ? loserTb : 7;
  }
  return { s1, s2, tb1, tb2, team1Wins };
}

async function recomputeGroupStats(groupId: string) {
  const gts = await prisma.groupTeam.findMany({ where: { groupId } });
  const matches = await prisma.match.findMany({
    where: { groupId, stato: "COMPLETATA" },
  });
  for (const gt of gts) {
    let punti = 0, gv = 0, gp = 0, n = 0;
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
    await prisma.groupTeam.update({
      where: { id: gt.id },
      data: { punti, gameVinti: gv, gamePersi: gp, matchGiocate: n },
    });
  }
}

async function main() {
  const tornei = await prisma.tournament.findMany({
    where: { fase: "GIRONI_2" },
    select: { id: true, nome: true, genere: true },
  });

  if (tornei.length === 0) {
    console.log("Nessun torneo in fase GIRONI_2.");
    return;
  }

  for (const t of tornei) {
    console.log(`\n=== ${t.nome} (${t.genere}) ===`);

    const phase2GroupIds = (
      await prisma.group.findMany({
        where: { tournamentId: t.id, fase: 2 },
        select: { id: true },
      })
    ).map((g) => g.id);

    const matches = await prisma.match.findMany({
      where: {
        tournamentId: t.id,
        groupId: { in: phase2GroupIds },
        round: 0,
        stato: { not: "COMPLETATA" },
        team1Id: { not: null },
        team2Id: { not: null },
      },
      select: { id: true, team1Id: true, team2Id: true, groupId: true },
    });

    console.log(`Partite fase 2 da simulare: ${matches.length}`);

    const touched = new Set<string>();
    for (const m of matches) {
      const { s1, s2, tb1, tb2, team1Wins } = randomScore();
      const winnerId = team1Wins ? m.team1Id! : m.team2Id!;
      const punteggio =
        tb1 != null && tb2 != null
          ? `${s1}-${s2} (${tb1}-${tb2})`
          : `${s1}-${s2}`;
      await prisma.match.update({
        where: { id: m.id },
        data: {
          stato: "COMPLETATA",
          iniziataAt: new Date(),
          finitaAt: new Date(),
          set1Team1: s1,
          set1Team2: s2,
          tieBreakTeam1: tb1,
          tieBreakTeam2: tb2,
          winnerId,
          punteggio,
        },
      });
      if (m.groupId) touched.add(m.groupId);
    }

    for (const gid of touched) await recomputeGroupStats(gid);

    console.log(`Stats ricalcolate per ${touched.size} gironi fase 2.`);
  }

  console.log("\nFatto. Prossimo passo admin: 'Genera Finali'.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
