import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.match.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.team.deleteMany();
  await prisma.player.deleteMany();

  const maschili = await Promise.all([
    prisma.player.create({ data: { nome: "Marco", cognome: "Rossi", genere: "MASCHILE", email: "rossi@test.it" } }),
    prisma.player.create({ data: { nome: "Luca", cognome: "Bianchi", genere: "MASCHILE", email: "bianchi@test.it" } }),
    prisma.player.create({ data: { nome: "Paolo", cognome: "Verdi", genere: "MASCHILE" } }),
    prisma.player.create({ data: { nome: "Andrea", cognome: "Neri", genere: "MASCHILE" } }),
    prisma.player.create({ data: { nome: "Stefano", cognome: "Ferrari", genere: "MASCHILE" } }),
    prisma.player.create({ data: { nome: "Roberto", cognome: "Russo", genere: "MASCHILE" } }),
    prisma.player.create({ data: { nome: "Davide", cognome: "Marini", genere: "MASCHILE" } }),
    prisma.player.create({ data: { nome: "Francesco", cognome: "Conti", genere: "MASCHILE" } }),
  ]);

  const femminili = await Promise.all([
    prisma.player.create({ data: { nome: "Giulia", cognome: "Romano", genere: "FEMMINILE" } }),
    prisma.player.create({ data: { nome: "Francesca", cognome: "Colombo", genere: "FEMMINILE" } }),
    prisma.player.create({ data: { nome: "Sara", cognome: "Ricci", genere: "FEMMINILE" } }),
    prisma.player.create({ data: { nome: "Chiara", cognome: "Marino", genere: "FEMMINILE" } }),
    prisma.player.create({ data: { nome: "Valentina", cognome: "Greco", genere: "FEMMINILE" } }),
    prisma.player.create({ data: { nome: "Elena", cognome: "Bruno", genere: "FEMMINILE" } }),
    prisma.player.create({ data: { nome: "Laura", cognome: "Gallo", genere: "FEMMINILE" } }),
    prisma.player.create({ data: { nome: "Silvia", cognome: "Barbieri", genere: "FEMMINILE" } }),
  ]);

  // 4 squadre maschili (2 teste di serie + 2 senza)
  const teamsM = await Promise.all([
    prisma.team.create({
      data: {
        nome: `${maschili[0].cognome} / ${maschili[1].cognome}`,
        genere: "MASCHILE",
        livello: 1,
        player1Id: maschili[0].id,
        player2Id: maschili[1].id,
      },
    }),
    prisma.team.create({
      data: {
        nome: `${maschili[2].cognome} / ${maschili[3].cognome}`,
        genere: "MASCHILE",
        livello: 2,
        player1Id: maschili[2].id,
        player2Id: maschili[3].id,
      },
    }),
    prisma.team.create({
      data: {
        nome: `${maschili[4].cognome} / ${maschili[5].cognome}`,
        genere: "MASCHILE",
        livello: 0,
        player1Id: maschili[4].id,
        player2Id: maschili[5].id,
      },
    }),
    prisma.team.create({
      data: {
        nome: `${maschili[6].cognome} / ${maschili[7].cognome}`,
        genere: "MASCHILE",
        livello: 0,
        player1Id: maschili[6].id,
        player2Id: maschili[7].id,
      },
    }),
  ]);

  const teamsF = await Promise.all([
    prisma.team.create({
      data: {
        nome: `${femminili[0].cognome} / ${femminili[1].cognome}`,
        genere: "FEMMINILE",
        livello: 1,
        player1Id: femminili[0].id,
        player2Id: femminili[1].id,
      },
    }),
    prisma.team.create({
      data: {
        nome: `${femminili[2].cognome} / ${femminili[3].cognome}`,
        genere: "FEMMINILE",
        livello: 2,
        player1Id: femminili[2].id,
        player2Id: femminili[3].id,
      },
    }),
    prisma.team.create({
      data: {
        nome: `${femminili[4].cognome} / ${femminili[5].cognome}`,
        genere: "FEMMINILE",
        livello: 0,
        player1Id: femminili[4].id,
        player2Id: femminili[5].id,
      },
    }),
    prisma.team.create({
      data: {
        nome: `${femminili[6].cognome} / ${femminili[7].cognome}`,
        genere: "FEMMINILE",
        livello: 0,
        player1Id: femminili[6].id,
        player2Id: femminili[7].id,
      },
    }),
  ]);

  const annoCorrente = new Date().getFullYear();

  const torneoM = await prisma.tournament.create({
    data: {
      nome: `Torneo Chanteclair ${annoCorrente}`,
      genere: "MASCHILE",
      stato: "ATTIVO",
      anno: annoCorrente,
    },
  });
  await prisma.tournament.create({
    data: {
      nome: `Torneo Chanteclair ${annoCorrente}`,
      genere: "FEMMINILE",
      stato: "BOZZA",
      anno: annoCorrente,
    },
  });

  // Bracket M precompilato: semifinali concluse, finale Verdi/Neri vs Ferrari/Russo ancora da giocare
  const byName = (nome: string) => teamsM.find((t) => t.nome === nome)!;
  const verdiNeri = byName("Verdi / Neri");
  const ferrariRusso = byName("Ferrari / Russo");
  const rossiBianchi = byName("Rossi / Bianchi");
  const mariniConti = byName("Marini / Conti");

  const ora = Date.now();
  const ore = (h: number) => new Date(ora - h * 3600 * 1000);

  await prisma.match.create({
    data: {
      tournamentId: torneoM.id,
      round: 2,
      posizione: 0,
      team1Id: verdiNeri.id,
      team2Id: mariniConti.id,
      winnerId: verdiNeri.id,
      punteggio: "6-3, 6-2",
      stato: "COMPLETATA",
      iniziataAt: ore(4),
      finitaAt: ore(3),
    },
  });
  await prisma.match.create({
    data: {
      tournamentId: torneoM.id,
      round: 2,
      posizione: 1,
      team1Id: ferrariRusso.id,
      team2Id: rossiBianchi.id,
      winnerId: ferrariRusso.id,
      punteggio: "7-5, 6-4",
      stato: "COMPLETATA",
      iniziataAt: ore(3),
      finitaAt: ore(2),
    },
  });
  await prisma.match.create({
    data: {
      tournamentId: torneoM.id,
      round: 1,
      posizione: 0,
      team1Id: verdiNeri.id,
      team2Id: ferrariRusso.id,
      stato: "ATTESA",
    },
  });

  console.log(`✅ Creati ${maschili.length} giocatori maschili + ${femminili.length} giocatrici femminili`);
  console.log(`✅ Create ${teamsM.length} squadre maschili + ${teamsF.length} squadre femminili`);
  console.log(`✅ Torneo MASCHILE ATTIVO: 2 semifinali COMPLETATE, finale ATTESA (Verdi/Neri vs Ferrari/Russo)`);
  console.log(`✅ Torneo FEMMINILE in BOZZA (${annoCorrente})`);
  console.log("");
  console.log("📋 Credenziali admin:");
  console.log("   Email:    admin@chanteclair.it");
  console.log("   Password: admin1234");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
