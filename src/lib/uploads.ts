import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function ensureUploadsDir() {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

function safeExt(filename: string): string {
  const raw = filename.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXT.has(raw) ? raw : "jpg";
}

export async function savePhoto(file: File): Promise<string> {
  await ensureUploadsDir();
  const ext = safeExt(file.name);
  const filename = `${randomUUID()}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}

export async function deletePhoto(fotoUrl: string | null | undefined) {
  if (!fotoUrl || !fotoUrl.startsWith("/uploads/")) return;
  const filename = path.basename(fotoUrl);
  const filepath = path.join(UPLOADS_DIR, filename);
  try {
    await unlink(filepath);
  } catch {
    // file already missing — ignore
  }
}
