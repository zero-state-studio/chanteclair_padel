import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "player-photos";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

function safeExt(filename: string): string {
  const raw = filename.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXT.has(raw) ? raw : "jpg";
}

let supabaseAdminCache: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error(
      "Supabase Storage non configurato: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY richiesti"
    );
  }
  if (!supabaseAdminCache) {
    supabaseAdminCache = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseAdminCache;
}

let bucketEnsured = false;
async function ensureBucket() {
  if (bucketEnsured) return;
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.storage.getBucket(BUCKET);
  if (!existing) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
    });
    if (error && !error.message.includes("already exists")) {
      throw new Error(`Errore creazione bucket: ${error.message}`);
    }
  }
  bucketEnsured = true;
}

// Compat: chiamato in vecchio codice. Ora ensureBucket lazy.
export async function ensureUploadsDir() {
  await ensureBucket();
}

export async function savePhoto(file: File): Promise<string> {
  await ensureBucket();
  const supabase = getSupabaseAdmin();
  const ext = safeExt(file.name);
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: file.type || `image/${ext}`,
      upsert: false,
    });
  if (error) throw new Error(`Upload fallito: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

export async function deletePhoto(fotoUrl: string | null | undefined) {
  if (!fotoUrl) return;
  // Estrai filename da URL pubblico Supabase Storage o legacy /uploads/
  const supabaseMatch = fotoUrl.match(
    new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)$`)
  );
  const legacyMatch = fotoUrl.match(/^\/uploads\/(.+)$/);
  const filename = supabaseMatch?.[1] ?? legacyMatch?.[1];
  if (!filename) return;
  if (legacyMatch) return; // legacy locale: ignora, file non più gestiti
  try {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(BUCKET).remove([filename]);
  } catch {
    // ignora errori di rimozione
  }
}
