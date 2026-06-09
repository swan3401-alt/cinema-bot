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
      title: "Dune: Part Two",
      description:
        "Paul Atreides unites with the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
      posterUrl: "https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg",
      date: new Date("2026-06-15"),
      time: "17:30",
      hall: "VIP ZAL",
      totalSeats: 73,
      price: 130000, // 130,000 UZS
    },
  });


  const seatData = [];

  // Row 1: 9 wide seats
  for (let number = 1; number <= 9; number++) {
    seatData.push({ movieId: movie.id, row: 1, number, type: SeatType.WIDE });
  }

  // Rows 2-6: 11 standard seats each
  for (let row = 2; row <= 6; row++) {
    for (let number = 1; number <= 11; number++) {
      seatData.push({ movieId: movie.id, row, number, type: SeatType.STANDARD });
    }
  }

  // Row 7: 9 standard seats - columns 1-4 and 7-11
  const row7Seats = [1, 2, 3, 4, 7, 8, 9, 10, 11];
  for (const number of row7Seats) {
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