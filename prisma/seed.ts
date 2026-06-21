import "dotenv/config";
import { PrismaClient, SeatType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing data
  await prisma.booking.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.movie.deleteMany();

  // Create the movie
  const movie = await prisma.movie.create({
    data: {
      title: "Veer Zaara",
      description:
        "",
      posterUrl: "https://images-eu.ssl-images-amazon.com/images/S/pv-target-images/015f9181f6f9c66f73f2865f701b2047dee3cc35e20bcfc3cb5f2591b28d3ecb._RI_V_TTW_.jpg",
      date: new Date("2026-06-14"),
      time: "17:00",
      hall: "Panorama, VIP ZAL",
      totalSeats: 72,
      price: 130000, // 130,000 UZS
    },
  });


  const seatData = [];


  // OLD LAYOUT

  // // Row 1: 9 wide seats
  // for (let number = 1; number <= 9; number++) {
  //   seatData.push({ movieId: movie.id, row: 1, number, type: SeatType.WIDE });
  // }

  // // Rows 2-6: 11 standard seats each
  // for (let row = 2; row <= 6; row++) {
  //   for (let number = 1; number <= 11; number++) {
  //     seatData.push({ movieId: movie.id, row, number, type: SeatType.STANDARD });
  //   }
  // }

  // // Row 7: 9 standard seats - columns 1-4 and 7-11
  // const row7Seats = [1, 2, 3, 4, 7, 8, 9, 10, 11];
  // for (const number of row7Seats) {
  //   seatData.push({ movieId: movie.id, row: 7, number, type: SeatType.STANDARD });
  // }


    // Rows: 1-6
  for (let row = 1; row <= 6; row++) {
    for (let number = 1; number <= 10; number++) {
      seatData.push({ movieId: movie.id, row, number, type: SeatType.STANDARD })
    }
  }

    // Row 7: 12 standard seats
  for (let number = 1; number <= 12; number++) {
    seatData.push({ movieId: movie.id, row: 7, number, type: SeatType.STANDARD });
  }


  await prisma.seat.createMany({ data: seatData });

  console.log(`✅ Movie created: ${movie.title}`);
  console.log(`✅ ${seatData.length} seats created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });