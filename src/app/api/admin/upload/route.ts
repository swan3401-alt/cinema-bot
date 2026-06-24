import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // stay under Vercel's ~4.5MB function body limit
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const secret = form.get("secret");
    const file = form.get("file");

    if (!isAdmin(typeof secret === "string" ? secret : null)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Use JPG, PNG, or WebP" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large (max 4MB)" }, { status: 400 });
    }

    const blob = await put(`posters/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true, // avoid filename collisions
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}