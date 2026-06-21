import { prisma } from "./prisma";
import { sendBotMessage } from "./telegram";




export type CancelResult =
  | { ok: true; freed: { row: number; number: number; movieTitle: string } }
  | { ok: false; reason: "paid" | "used" | "already" | "not_found" };

export async function cancelBooking(
  token: string,
  telegramId: string,
  actorLabel?: string
): Promise<CancelResult> {
  const booking = await prisma.booking.findFirst({
    where: { token, telegramId },
    include: { seat: true, movie: true },
  });

  if (!booking) return { ok: false, reason: "not_found" };
  if (booking.status === "USED") return { ok: false, reason: "used" };
  if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
    return { ok: false, reason: "already" };
  }

  const staffGroupId = process.env.STAFF_GROUP_ID;
  const who = actorLabel ? `${actorLabel} (id ${telegramId})` : `id ${telegramId}`;
  const seatStr = `R${booking.seat.row}·${booking.seat.number}`;

  // Inline button staff taps once they've handled the refund
  const approveMarkup = {
    inline_keyboard: [[{ text: "✅ Approve cancellation", callback_data: `cxl_ok:${token}` }]],
  };

  // PAID - user can't self-cancel; notify staff to handle it
  if (booking.status === "PAID") {
    if (staffGroupId) {
      await sendBotMessage(
        staffGroupId,
        `💸 Paid-ticket cancellation requested\n👤 ${who}\n🎬 ${booking.movie.title}\n💺 Seat ${seatStr}\nApprove below once handled.`,
        approveMarkup
      );
    }
    return { ok: false, reason: "paid" };
  }

  // PENDING / AWAITING_PAYMENT - cancel, guarded against a race with staff approval
  const result = await prisma.booking.updateMany({
    where: { token, status: { in: ["PENDING", "AWAITING_PAYMENT"] } },
    data: { status: "CANCELLED" },
  });

  if (result.count === 0) {
    const fresh = await prisma.booking.findUnique({ where: { token }, select: { status: true } });
    if (fresh?.status === "PAID") {
      if (staffGroupId) {
        await sendBotMessage(
          staffGroupId,
          `💸 Paid-ticket cancellation requested\n👤 ${who}\n🎬 ${booking.movie.title}\n💺 Seat ${seatStr}`,
          approveMarkup
        );
      }
      return { ok: false, reason: "paid" };
    }
    return { ok: false, reason: "already" };
  }

  if (staffGroupId) {
    await sendBotMessage(
      staffGroupId,
      `🚫 Reservation cancelled by user\n👤 ${who}\n🎬 ${booking.movie.title}\n💺 Freed seat: ${seatStr}`
    );
  }

  return {
    ok: true,
    freed: { row: booking.seat.row, number: booking.seat.number, movieTitle: booking.movie.title },
  };
}