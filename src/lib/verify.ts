import { prisma } from "@/lib/prisma";

export type VerifyResult =
  | { ok: true; booking: VerifiedBooking }
  | { ok: false; reason: "NOT_FOUND" | "NOT_PAID" | "ALREADY_USED" | "CANCELLED"; booking?: VerifiedBooking };

export interface VerifiedBooking {
  token: string;
  movieTitle: string;
  date: Date;
  time: string;
  hall: string;
  row: number;
  number: number;
  usedAt: Date | null;
}

function toVerified(b: {
  token: string;
  usedAt: Date | null;
  seat: { row: number; number: number };
  session: { date: Date; time: string; movie: { title: string }; hall: { name: string } };
}): VerifiedBooking {
  return {
    token: b.token,
    movieTitle: b.session.movie.title,
    date: b.session.date,
    time: b.session.time,
    hall: b.session.hall.name,
    row: b.seat.row,
    number: b.seat.number,
    usedAt: b.usedAt,
  };
}

export async function verifyTicket(token: string): Promise<VerifyResult> {
  const booking = await prisma.booking.findUnique({
    where: { token },
    include: { seat: true, session: { include: { movie: true, hall: true } } },
  });

  if (!booking) return { ok: false, reason: "NOT_FOUND" };

  const verified = toVerified(booking);

  if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
    return { ok: false, reason: "CANCELLED", booking: verified };
  }

  if (booking.status === "USED") {
    return { ok: false, reason: "ALREADY_USED", booking: verified };
  }

  if (booking.status !== "PAID") {
    return { ok: false, reason: "NOT_PAID", booking: verified };
  }

  // Atomic single-use flip: only succeeds if still PAID right now
  // If two scanners hit simultaneously, only one updates a row
  const claimed = await prisma.booking.updateMany({
    where: { token, status: "PAID" },
    data: { status: "USED", usedAt: new Date() },
  });

  if (claimed.count === 0) {
    // Someone else claimed it in the race
    return { ok: false, reason: "ALREADY_USED", booking: verified };
  }

  return { ok: true, booking: { ...verified, usedAt: new Date() } };
}