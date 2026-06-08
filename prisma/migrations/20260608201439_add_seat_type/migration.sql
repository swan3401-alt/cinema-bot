-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Seat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Seat_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Seat" ("id", "isBooked", "movieId", "number", "row") SELECT "id", "isBooked", "movieId", "number", "row" FROM "Seat";
DROP TABLE "Seat";
ALTER TABLE "new_Seat" RENAME TO "Seat";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
