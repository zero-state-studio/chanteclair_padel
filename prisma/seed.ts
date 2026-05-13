import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NOMI_M = [
  "Marco","Luca","Paolo","Andrea","Stefano","Roberto","Davide","Francesco",
  "Giorgio","Matteo","Alessio","Simone","Lorenzo","Giovanni","Mario","Filippo",
  "Federico","Tommaso","Riccardo","Edoardo","Daniele","Pietro","Nicolò","Gabriele",
  "Vincenzo","Antonio","Salvatore","Giuseppe","Michele","Carlo","Enrico","Massimo",
  "Cristian","Alberto","Emanuele","Leonardo",
];

const NOMI_F = [
  "Giulia","Francesca","Sara","Chiara","Valentina","Elena","Laura","Silvia",
  "Martina","Alessia","Federica","Anna","Maria","Sofia","Beatrice","Roberta",
  "Cristina","Paola","Stefania","Lucia","Caterina","Camilla","Eleonora","Margherita",
  "Aurora","Vittoria","Bianca","Giada","Arianna","Ginevra","Letizia","Carolina",
  "Emma","Alice","Greta","Noemi",
];

const COGNOMI = [
  "Rossi","Bianchi","Verdi","Neri","Ferrari","Russo","Marini","Conti",
  "Romano","Colombo","Ricci","Marino","Greco","Bruno","Gallo","Barbieri",
  "Lombardi","Moretti","Esposito","Riva","Costa","Mancini","Vitale","Sala",
  "Fontana","Caruso","Coppola","Leone","Longo","Gentile","Martini","De Luca",
  "Fabbri","Galli","Serra","Mariani","Rinaldi","Villa","Pellegrini","Sanna",
  "Testa","Battaglia","Monti","Orlando","Marchetti","Bernardi","Damico","Bellini",
  "Palumbo","Negri","Cattaneo","Ferri","Vitali","Rizzi","Donati","Magni",
];

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.match.deleteMany();
  await prisma.groupTeam.deleteMany();
  await prisma.group.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.team.deleteMany();
  await prisma.player.deleteMany();

  const avatarM = ["/uploads/avatar_01.png", "/uploads/avatar_03.png", "/uploads/avatar_05.png", "/uploads/avatar_07.png"];
  const avatarF = ["/uploads/avatar_02.png", "/uploads/avatar_04.png", "/uploads/avatar_06.png", "/uploads/avatar_08.png"];

  // 72 maschili — 36 teams of 2 players
  const maschili = await Promise.all(
    Array.from({ length: 72 }, (_, i) => {
      const nome = NOMI_M[i % NOMI_M.length];
      const cognome = COGNOMI[i % COGNOMI.length];
      const suffix = Math.floor(i / COGNOMI.length) > 0 ? ` ${Math.floor(i / COGNOMI.length) + 1}` : "";
      const data: { nome: string; cognome: string; fotoUrl?: string } = {
        nome,
        cognome: `${cognome}${suffix}`,
      };
      if (i < 4) data.fotoUrl = avatarM[i];
      return prisma.player.create({ data });
    })
  );

  // 72 femminili
  const femminili = await Promise.all(
    Array.from({ length: 72 }, (_, i) => {
      const nome = NOMI_F[i % NOMI_F.length];
      const cognome = COGNOMI[i % COGNOMI.length];
      const suffix = Math.floor(i / COGNOMI.length) > 0 ? ` ${Math.floor(i / COGNOMI.length) + 1}` : "";
      const data: { nome: string; cognome: string; fotoUrl?: string } = {
        nome,
        cognome: `${cognome}${suffix}`,
      };
      if (i < 4) data.fotoUrl = avatarF[i];
      return prisma.player.create({ data });
    })
  );

  // 36 squadre maschili
  const teamsM = await Promise.all(
    Array.from({ length: 36 }, (_, i) => {
      const p1 = maschili[i * 2];
      const p2 = maschili[i * 2 + 1];
      return prisma.team.create({
        data: {
          nome: `${p1.cognome} / ${p2.cognome}`,
          genere: "MASCHILE",
          livello: 0,
          player1Id: p1.id,
          player2Id: p2.id,
        },
      });
    })
  );

  // 36 squadre femminili
  const teamsF = await Promise.all(
    Array.from({ length: 36 }, (_, i) => {
      const p1 = femminili[i * 2];
      const p2 = femminili[i * 2 + 1];
      return prisma.team.create({
        data: {
          nome: `${p1.cognome} / ${p2.cognome}`,
          genere: "FEMMINILE",
          livello: 0,
          player1Id: p1.id,
          player2Id: p2.id,
        },
      });
    })
  );

  const annoCorrente = new Date().getFullYear();

  await prisma.tournament.create({
    data: {
      nome: `Torneo Chanteclair ${annoCorrente}`,
      genere: "MASCHILE",
      stato: "BOZZA",
      fase: "BOZZA",
      anno: annoCorrente,
    },
  });
  await prisma.tournament.create({
    data: {
      nome: `Torneo Chanteclair ${annoCorrente}`,
      genere: "FEMMINILE",
      stato: "BOZZA",
      fase: "BOZZA",
      anno: annoCorrente,
    },
  });

  console.log(`✅ Creati ${maschili.length} giocatori maschili + ${femminili.length} giocatrici femminili`);
  console.log(`✅ Create ${teamsM.length} squadre maschili + ${teamsF.length} squadre femminili`);
  console.log(`✅ 2 tornei in BOZZA (Maschile + Femminile) ${annoCorrente}`);
  console.log("");
  console.log("📋 Credenziali admin (configurate via env ADMIN_EMAIL/ADMIN_PASSWORD)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
