import { promises as fs } from "node:fs";
import path from "node:path";
import type { SpotifyAlbum } from "@/lib/spotify";

type ArtistAlbumsSnapshot = {
  artistId: string;
  albums: SpotifyAlbum[];
  updatedAt: string;
};

const CACHE_DIR = path.join(process.cwd(), ".cache", "artist-albums");

function getCacheFile(artistId: string) {
  return path.join(CACHE_DIR, `${artistId}.json`);
}

function normalizeAlbums(input: unknown): SpotifyAlbum[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      name: String(item.name ?? ""),
      release_date: String(item.release_date ?? ""),
      images: Array.isArray(item.images)
        ? item.images
            .filter((image): image is Record<string, unknown> => Boolean(image) && typeof image === "object")
            .map((image) => ({
              url: String(image.url ?? ""),
              width: typeof image.width === "number" ? image.width : null,
              height: typeof image.height === "number" ? image.height : null
            }))
            .filter((image) => image.url.length > 0)
        : [],
      album_type: String(item.album_type ?? "album"),
      total_tracks: typeof item.total_tracks === "number" ? item.total_tracks : 0,
      artists: Array.isArray(item.artists)
        ? item.artists
            .filter((artist): artist is Record<string, unknown> => Boolean(artist) && typeof artist === "object")
            .map((artist) => ({
              id: String(artist.id ?? ""),
              name: String(artist.name ?? "")
            }))
            .filter((artist) => artist.id.length > 0 && artist.name.length > 0)
        : [],
      external_urls:
        item.external_urls && typeof item.external_urls === "object"
          ? { spotify: String((item.external_urls as Record<string, unknown>).spotify ?? "") }
          : undefined
    }))
    .filter((album) => album.id.length > 0 && album.name.length > 0);
}

export async function readCachedArtistAlbums(artistId: string) {
  try {
    const raw = await fs.readFile(getCacheFile(artistId), "utf-8");
    const parsed = JSON.parse(raw) as ArtistAlbumsSnapshot;
    const albums = normalizeAlbums(parsed.albums);
    if (albums.length === 0) return null;
    return {
      albums,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return null;
  }
}

export async function writeCachedArtistAlbums(artistId: string, albums: SpotifyAlbum[]) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const snapshot: ArtistAlbumsSnapshot = {
      artistId,
      albums,
      updatedAt: new Date().toISOString()
    };
    await fs.writeFile(getCacheFile(artistId), JSON.stringify(snapshot, null, 2), "utf-8");
  } catch {
    // Cache write failures should never break page rendering.
  }
}
