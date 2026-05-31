import { promises as fs } from "node:fs";
import path from "node:path";
import { getSpotifyAlbum, getSpotifyArtist, getSpotifyArtistAlbums, getSpotifyCuratedAlbums } from "@/lib/spotify";
import { writeCachedAlbumDetail } from "@/lib/album-cache";
import { writeCachedArtistProfile } from "@/lib/artist-profile-cache";
import { writeCachedArtistAlbums } from "@/lib/artist-cache";

export type CuratedAlbumCard = {
  id: string;
  title: string;
  coverUrl: string;
  artistName: string;
};

export type CuratedSnapshot = {
  albums: CuratedAlbumCard[];
  updatedAt: string;
};

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "curated-albums.json");
const MEMORY_CACHE_KEY = "__vibe_curated_snapshot__";
const IS_VERCEL = process.env.VERCEL === "1";

function getMemorySnapshot() {
  return (globalThis as Record<string, unknown>)[MEMORY_CACHE_KEY] as CuratedSnapshot | undefined;
}

function setMemorySnapshot(snapshot: CuratedSnapshot) {
  (globalThis as Record<string, unknown>)[MEMORY_CACHE_KEY] = snapshot;
}

function normalizeSnapshot(input: unknown): CuratedSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  if (!Array.isArray(record.albums) || typeof record.updatedAt !== "string") return null;
  const albums = record.albums
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.title ?? ""),
      coverUrl: String(item.coverUrl ?? ""),
      artistName: String(item.artistName ?? "")
    }))
    .filter((album) => album.id && album.title && album.coverUrl && album.artistName);
  if (albums.length === 0) return null;
  return {
    albums,
    updatedAt: record.updatedAt
  };
}

function toCuratedSnapshot(albums: Awaited<ReturnType<typeof getSpotifyCuratedAlbums>>): CuratedSnapshot {
  const mapped: CuratedAlbumCard[] = albums.map((album) => ({
    id: album.id,
    title: album.name,
    coverUrl: album.images[0]?.url ?? "",
    artistName: album.artists.map((artist) => artist.name).join(", ")
  }));
  return {
    albums: mapped.filter((album) => Boolean(album.coverUrl)).slice(0, 8),
    updatedAt: new Date().toISOString()
  };
}

export async function readCuratedSnapshot() {
  const inMemory = getMemorySnapshot();
  if (inMemory) return inMemory;
  if (IS_VERCEL) return null;

  try {
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const snapshot = normalizeSnapshot(parsed);
    if (snapshot) {
      setMemorySnapshot(snapshot);
      return snapshot;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeCuratedSnapshot(snapshot: CuratedSnapshot) {
  if (!IS_VERCEL) {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
  }
  setMemorySnapshot(snapshot);
}

export async function refreshCuratedSnapshot() {
  const albums = await getSpotifyCuratedAlbums(8);
  const snapshot = toCuratedSnapshot(albums);

  if (IS_VERCEL) {
    // Serverless runtime should avoid heavy prewarm and file writes.
    setMemorySnapshot(snapshot);
    return snapshot;
  }

  // Warm the rate page cache so opening a curated album is fast.
  const warmedArtistIds = new Set<string>();
  for (const album of snapshot.albums) {
    try {
      const detail = await getSpotifyAlbum(album.id);
      await writeCachedAlbumDetail(album.id, detail);

      // Warm the artist page cache for quick transition from rate page.
      for (const artist of detail.artists) {
        if (warmedArtistIds.has(artist.id)) continue;
        warmedArtistIds.add(artist.id);

        try {
          const artistProfile = await getSpotifyArtist(artist.id);
          await writeCachedArtistProfile(artist.id, artistProfile);
        } catch (error) {
          console.warn(`Artist profile prewarm failed: ${artist.id}`, error);
        }

        try {
          const artistAlbums = await getSpotifyArtistAlbums(artist.id);
          await writeCachedArtistAlbums(artist.id, artistAlbums);
        } catch (error) {
          console.warn(`Artist albums prewarm failed: ${artist.id}`, error);
        }
      }
    } catch (error) {
      console.warn(`Album prewarm failed: ${album.id}`, error);
    }
  }

  await writeCuratedSnapshot(snapshot);
  return snapshot;
}

export async function fetchCuratedSnapshotLightweight() {
  const albums = await getSpotifyCuratedAlbums(8);
  const snapshot = toCuratedSnapshot(albums);
  setMemorySnapshot(snapshot);
  return snapshot;
}
