import { promises as fs } from "node:fs";
import path from "node:path";
import type { SpotifyArtist } from "@/lib/spotify";

type ArtistProfileSnapshot = {
  artistId: string;
  artist: SpotifyArtist;
  updatedAt: string;
};

const CACHE_DIR = path.join(process.cwd(), ".cache", "artist-profiles");

function getCacheFile(artistId: string) {
  return path.join(CACHE_DIR, `${artistId}.json`);
}

function normalizeArtist(input: unknown): SpotifyArtist | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const id = String(record.id ?? "");
  const name = String(record.name ?? "");
  if (!id || !name) return null;

  const images = Array.isArray(record.images)
    ? record.images
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          url: String(item.url ?? ""),
          width: typeof item.width === "number" ? item.width : null,
          height: typeof item.height === "number" ? item.height : null
        }))
        .filter((item) => item.url.length > 0)
    : [];

  const genres = Array.isArray(record.genres)
    ? record.genres.filter((item): item is string => typeof item === "string")
    : [];

  return {
    id,
    name,
    genres,
    popularity: typeof record.popularity === "number" ? record.popularity : 0,
    images,
    external_urls:
      record.external_urls && typeof record.external_urls === "object"
        ? { spotify: String((record.external_urls as Record<string, unknown>).spotify ?? "") }
        : undefined
  };
}

export async function readCachedArtistProfile(artistId: string) {
  try {
    const raw = await fs.readFile(getCacheFile(artistId), "utf-8");
    const parsed = JSON.parse(raw) as ArtistProfileSnapshot;
    const artist = normalizeArtist(parsed.artist);
    if (!artist) return null;
    return {
      artist,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return null;
  }
}

export async function writeCachedArtistProfile(artistId: string, artist: SpotifyArtist) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const snapshot: ArtistProfileSnapshot = {
      artistId,
      artist,
      updatedAt: new Date().toISOString()
    };
    await fs.writeFile(getCacheFile(artistId), JSON.stringify(snapshot, null, 2), "utf-8");
  } catch {
    // Cache write failure should not break requests.
  }
}
