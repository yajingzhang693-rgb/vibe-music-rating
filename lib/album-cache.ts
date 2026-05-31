import { promises as fs } from "node:fs";
import path from "node:path";
import type { SpotifyAlbumDetail } from "@/lib/spotify";

type AlbumDetailSnapshot = {
  albumId: string;
  album: SpotifyAlbumDetail;
  updatedAt: string;
};

const CACHE_DIR = path.join(process.cwd(), ".cache", "album-details");

function getCacheFile(albumId: string) {
  return path.join(CACHE_DIR, `${albumId}.json`);
}

function normalizeAlbumDetail(input: unknown): SpotifyAlbumDetail | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;

  const id = String(record.id ?? "");
  const name = String(record.name ?? "");
  const releaseDate = String(record.release_date ?? "");
  if (!id || !name || !releaseDate) return null;

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

  const artists = Array.isArray(record.artists)
    ? record.artists
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          id: String(item.id ?? ""),
          name: String(item.name ?? "")
        }))
        .filter((item) => item.id.length > 0 && item.name.length > 0)
    : [];

  const tracksRecord =
    record.tracks && typeof record.tracks === "object" ? (record.tracks as Record<string, unknown>) : {};
  const trackItems = Array.isArray(tracksRecord.items)
    ? tracksRecord.items
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          id: typeof item.id === "string" ? item.id : null,
          name: String(item.name ?? ""),
          duration_ms: typeof item.duration_ms === "number" ? item.duration_ms : 0,
          track_number: typeof item.track_number === "number" ? item.track_number : 0
        }))
        .filter((item) => item.name.length > 0)
    : [];

  return {
    id,
    name,
    release_date: releaseDate,
    images,
    artists,
    tracks: { items: trackItems },
    external_urls:
      record.external_urls && typeof record.external_urls === "object"
        ? { spotify: String((record.external_urls as Record<string, unknown>).spotify ?? "") }
        : undefined
  };
}

export async function readCachedAlbumDetail(albumId: string) {
  try {
    const raw = await fs.readFile(getCacheFile(albumId), "utf-8");
    const parsed = JSON.parse(raw) as AlbumDetailSnapshot;
    const album = normalizeAlbumDetail(parsed.album);
    if (!album) return null;
    return {
      album,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return null;
  }
}

export async function writeCachedAlbumDetail(albumId: string, album: SpotifyAlbumDetail) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const snapshot: AlbumDetailSnapshot = {
      albumId,
      album,
      updatedAt: new Date().toISOString()
    };
    await fs.writeFile(getCacheFile(albumId), JSON.stringify(snapshot, null, 2), "utf-8");
  } catch {
    // Cache write failure should not break requests.
  }
}
