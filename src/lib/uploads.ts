import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLAYER_BUCKET = "player-photos";
const SPONSOR_BUCKET = "sponsor-logos";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
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

const ensuredBuckets = new Set<string>();
async function ensureBucket(bucket: string) {
  if (ensuredBuckets.has(bucket)) return;
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.storage.getBucket(bucket);
  if (!existing) {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif",
        "image/svg+xml",
      ],
    });
    if (error && !error.message.includes("already exists")) {
      throw new Error(`Errore creazione bucket: ${error.message}`);
    }
  }
  ensuredBuckets.add(bucket);
}

async function uploadToBucket(file: File, id: string, bucket: string): Promise<string> {
  await ensureBucket(bucket);
  const supabase = getSupabaseAdmin();
  const mime = safeMime(file);
  const filename = id;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType: mime,
      upsert: true,
    });
  if (error) throw new Error(`Upload fallito: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return `${data.publicUrl}?v=${Date.now()}`;
}

async function removeFromBucket(idOrUrl: string | null | undefined, bucket: string) {
  if (!idOrUrl) return;
  let filename: string | null = null;
  const supabaseMatch = idOrUrl.match(
    new RegExp(`/storage/v1/object/public/${bucket}/([^?]+)`)
  );
  const legacyMatch = idOrUrl.match(/^\/uploads\/(.+)$/);
  if (supabaseMatch) filename = supabaseMatch[1];
  else if (legacyMatch) return; // legacy locale: ignora
  else filename = idOrUrl; // assume id nudo

  if (!filename) return;
  try {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(bucket).remove([filename]);
  } catch {
    // ignora errori di rimozione
  }
}

export function savePhoto(file: File, playerId: string): Promise<string> {
  return uploadToBucket(file, playerId, PLAYER_BUCKET);
}

export function deletePhoto(playerIdOrUrl: string | null | undefined) {
  return removeFromBucket(playerIdOrUrl, PLAYER_BUCKET);
}

export function saveSponsorLogo(file: File, sponsorId: string): Promise<string> {
  return uploadToBucket(file, sponsorId, SPONSOR_BUCKET);
}

export function deleteSponsorLogo(sponsorIdOrUrl: string | null | undefined) {
  return removeFromBucket(sponsorIdOrUrl, SPONSOR_BUCKET);
}
