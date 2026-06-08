export type SeatStatus = "available" | "booked" | "selected";

export type SeatType = "WIDE" | "STANDARD";

export interface Seat {
  id: string;
  row: number;
  number: number;
  type: SeatType;
  isBooked: boolean;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  date: Date;
  time: string;
  hall: string;
  totalSeats: number;
  price: number;
  seats: Seat[];
}

export interface Booking {
  id: string;
  token: string;
  movieId: string;
  seatId: string;
  telegramId: string;
  status: "PENDING" | "PAID" | "USED" | "CANCELLED";
}