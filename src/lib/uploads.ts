import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "player-photos";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function safeMime(file: File): string {
  const t = file.type?.toLowerCase() ?? "";
  return ALLOWED_MIME.has(t) ? t : "image/jpeg";
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

export async function savePhoto(file: File, playerId: string): Promise<string> {
  await ensureBucket();
  const supabase = getSupabaseAdmin();
  const mime = safeMime(file);
  const filename = playerId;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: mime,
      upsert: true,
    });
  if (error) throw new Error(`Upload fallito: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deletePhoto(playerIdOrUrl: string | null | undefined) {
  if (!playerIdOrUrl) return;
  let filename: string | null = null;
  const supabaseMatch = playerIdOrUrl.match(
    new RegExp(`/storage/v1/object/public/${BUCKET}/([^?]+)`)
  );
  const legacyMatch = playerIdOrUrl.match(/^\/uploads\/(.+)$/);
  if (supabaseMatch) filename = supabaseMatch[1];
  else if (legacyMatch) return; // legacy locale: ignora
  else filename = playerIdOrUrl; // assume playerId nudo

  if (!filename) return;
  try {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(BUCKET).remove([filename]);
  } catch {
    // ignora errori di rimozione
  }
}
