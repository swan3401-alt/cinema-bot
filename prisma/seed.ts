import "dotenv/config";
import { PrismaClient, SeatType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hall = await prisma.hall.create({ data: { name: "Panorama, VIP ZAL" } });

  const seatData: { hallId: string; row: number; number: number; type: SeatType }[] = [];
  for (let n = 1; n <= 9; n++) seatData.push({ hallId: hall.id, row: 1, number: n, type: SeatType.WIDE });
  for (let row = 2; row <= 6; row++)
    for (let n = 1; n <= 11; n++) seatData.push({ hallId: hall.id, row, number: n, type: SeatType.STANDARD });
  for (const n of [1, 2, 3, 4, 7, 8, 9, 10, 11])
    seatData.push({ hallId: hall.id, row: 7, number: n, type: SeatType.STANDARD });
  await prisma.seat.createMany({ data: seatData });

  const movie = await prisma.movie.create({
    data: {
      title: "Veer Zaara",
      posterUrl:
        "https://images-eu.ssl-images-amazon.com/images/S/pv-target-images/015f9181f6f9c66f73f2865f701b2047dee3cc35e20bcfc3cb5f2591b28d3ecb._RI_V_TTW_.jpg",
    },
  });

  await prisma.session.createMany({
    data: [
      { movieId: movie.id, hallId: hall.id, date: new Date("2026-06-28"), time: "17:00", price: 130000 },
      { movieId: movie.id, hallId: hall.id, date: new Date("2026-06-28"), time: "20:00", price: 150000 },
    ],
  });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());