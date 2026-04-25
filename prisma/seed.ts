import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.match.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.team.deleteMany();
  await prisma.player.deleteMany();

  // Avatar disponibili: 4 maschili (01, 03, 05, 07) + 4 femminili (02, 04, 06, 08)
  // Assegnati ai primi 4 player di ogni genere; gli altri 4 mostrano iniziali.
  const avatarM = ["/uploads/avatar_01.png", "/uploads/avatar_03.png", "/uploads/avatar_05.png", "/uploads/avatar_07.png"];
  const avatarF = ["/uploads/avatar_02.png", "/uploads/avatar_04.png", "/uploads/avatar_06.png", "/uploads/avatar_08.png"];

  const maschili = await Promise.all([
    prisma.player.create({ data: { nome: "Marco", cognome: "Rossi", email: "rossi@test.it", fotoUrl: avatarM[0] } }),
    prisma.player.create({ data: { nome: "Luca", cognome: "Bianchi", email: "bianchi@test.it", fotoUrl: avatarM[1] } }),
    prisma.player.create({ data: { nome: "Paolo", cognome: "Verdi", fotoUrl: avatarM[2] } }),
    prisma.player.create({ data: { nome: "Andrea", cognome: "Neri", fotoUrl: avatarM[3] } }),
    prisma.player.create({ data: { nome: "Stefano", cognome: "Ferrari" } }),
    prisma.player.create({ data: { nome: "Roberto", cognome: "Russo" } }),
    prisma.player.create({ data: { nome: "Davide", cognome: "Marini" } }),
    prisma.player.create({ data: { nome: "Francesco", cognome: "Conti" } }),
  ]);

  const femminili = await Promise.all([
    prisma.player.create({ data: { nome: "Giulia", cognome: "Romano", fotoUrl: avatarF[0] } }),
    prisma.player.create({ data: { nome: "Francesca", cognome: "Colombo", fotoUrl: avatarF[1] } }),
    prisma.player.create({ data: { nome: "Sara", cognome: "Ricci", fotoUrl: avatarF[2] } }),
    prisma.player.create({ data: { nome: "Chiara", cognome: "Marino", fotoUrl: avatarF[3] } }),
    prisma.player.create({ data: { nome: "Valentina", cognome: "Greco" } }),
    prisma.player.create({ data: { nome: "Elena", cognome: "Bruno" } }),
    prisma.player.create({ data: { nome: "Laura", cognome: "Gallo" } }),
    prisma.player.create({ data: { nome: "Silvia", cognome: "Barbieri" } }),
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
