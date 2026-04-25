import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.match.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.player.deleteMany();

  const maschili = await Promise.all([
    prisma.player.create({
      data: {
        nome: "Marco",
        cognome: "Rossi",
        genere: "MASCHILE",
        livello: 1,
        email: "rossi@test.it",
      },
    }),
    prisma.player.create({
      data: {
        nome: "Luca",
        cognome: "Bianchi",
        genere: "MASCHILE",
        livello: 2,
        email: "bianchi@test.it",
      },
    }),
    prisma.player.create({
      data: { nome: "Paolo", cognome: "Verdi", genere: "MASCHILE", livello: 3 },
    }),
    prisma.player.create({
      data: { nome: "Andrea", cognome: "Neri", genere: "MASCHILE", livello: 4 },
    }),
    prisma.player.create({
      data: { nome: "Stefano", cognome: "Ferrari", genere: "MASCHILE", livello: 0 },
    }),
    prisma.player.create({
      data: { nome: "Roberto", cognome: "Russo", genere: "MASCHILE", livello: 0 },
    }),
    prisma.player.create({
      data: { nome: "Davide", cognome: "Marini", genere: "MASCHILE", livello: 0 },
    }),
    prisma.player.create({
      data: { nome: "Francesco", cognome: "Conti", genere: "MASCHILE", livello: 0 },
    }),
  ]);

  const femminili = await Promise.all([
    prisma.player.create({
      data: { nome: "Giulia", cognome: "Romano", genere: "FEMMINILE", livello: 1 },
    }),
    prisma.player.create({
      data: { nome: "Francesca", cognome: "Colombo", genere: "FEMMINILE", livello: 2 },
    }),
    prisma.player.create({
      data: { nome: "Sara", cognome: "Ricci", genere: "FEMMINILE", livello: 3 },
    }),
    prisma.player.create({
      data: { nome: "Chiara", cognome: "Marino", genere: "FEMMINILE", livello: 4 },
    }),
    prisma.player.create({
      data: { nome: "Valentina", cognome: "Greco", genere: "FEMMINILE", livello: 0 },
    }),
    prisma.player.create({
      data: { nome: "Elena", cognome: "Bruno", genere: "FEMMINILE", livello: 0 },
    }),
    prisma.player.create({
      data: { nome: "Laura", cognome: "Gallo", genere: "FEMMINILE", livello: 0 },
    }),
    prisma.player.create({
      data: { nome: "Silvia", cognome: "Barbieri", genere: "FEMMINILE", livello: 0 },
    }),
  ]);

  const annoCorrente = new Date().getFullYear();

  await prisma.tournament.create({
    data: {
      nome: `Torneo Chanteclair ${annoCorrente}`,
      genere: "MASCHILE",
      stato: "BOZZA",
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

  console.log(`✅ Creati ${maschili.length} giocatori maschili`);
  console.log(`✅ Creati ${femminili.length} giocatrici femminili`);
  console.log(`✅ Creati 2 tornei in stato BOZZA (${annoCorrente})`);
  console.log("");
  console.log("📋 Credenziali admin:");
  console.log("   Email:    admin@chanteclair.it");
  console.log("   Password: admin123");
  console.log("");
  console.log("🎯 Prossimi passi:");
  console.log("   1. Avvia il server:    npm run dev");
  console.log("   2. Vai su:             http://localhost:3000/admin/login");
  console.log("   3. Accedi e poi:       /admin/torneo → Esegui Sorteggio");
  console.log("   4. Apri tabellone:     http://localhost:3000/tabellone-maschile");
  console.log("   5. Da admin/partite:   Inizia partita → osserva overlay live!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
