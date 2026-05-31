const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_RESPONSE_CACHE_TTL_MS = 10 * 60 * 1000;

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;
const responseCache = new Map<string, { expiresAt: number; data: unknown }>();

type SpotifyImage = {
  url: string;
  width: number | null;
  height: number | null;
};

export type SpotifyArtist = {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: SpotifyImage[];
  external_urls?: { spotify?: string };
};

export type SpotifyAlbum = {
  id: string;
  name: string;
  release_date: string;
  images: SpotifyImage[];
  album_type: string;
  total_tracks: number;
  artists: Array<{ id: string; name: string }>;
  external_urls?: { spotify?: string };
};

export type SpotifyAlbumTrack = {
  id: string | null;
  name: string;
  duration_ms: number;
  track_number: number;
};

export type SpotifyAlbumDetail = {
  id: string;
  name: string;
  release_date: string;
  images: SpotifyImage[];
  artists: Array<{ id: string; name: string }>;
  tracks: {
    items: SpotifyAlbumTrack[];
  };
  external_urls?: { spotify?: string };
};

function getRequiredEnv(name: "SPOTIFY_CLIENT_ID" | "SPOTIFY_CLIENT_SECRET") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export async function getSpotifyAccessToken() {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.accessToken;
  }

  const clientId = getRequiredEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = getRequiredEnv("SPOTIFY_CLIENT_SECRET");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Spotify token: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: data.access_token,
    // Leave 60s buffer before actual expiry.
    expiresAt: now + (data.expires_in - 60) * 1000
  };
  return tokenCache.accessToken;
}

async function spotifyFetch<T>(path: string, query?: Record<string, string>) {
  const token = await getSpotifyAccessToken();
  const url = new URL(`${SPOTIFY_API_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  const cacheKey = url.toString();
  const now = Date.now();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  async function requestOnce() {
    return fetch(cacheKey, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      // Keep data reasonably fresh while reducing API pressure.
      next: { revalidate: 120 }
    });
  }

  let response = await requestOnce();
  let attempt = 0;
  while (response.status === 429 && attempt < 3) {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = Number.parseInt(retryAfterHeader ?? "0", 10);
    const retryDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.min(retryAfterSeconds * 1000, 8000)
      : Math.min(1000 * 2 ** attempt, 8000);
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    response = await requestOnce();
    attempt += 1;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as T;
  responseCache.set(cacheKey, {
    expiresAt: now + SPOTIFY_RESPONSE_CACHE_TTL_MS,
    data
  });
  return data;
}

export async function searchArtists(query: string, limit = 5) {
  const data = await spotifyFetch<{ artists: { items: SpotifyArtist[] } }>("/search", {
    q: query,
    type: "artist",
    limit: String(limit)
  });
  return data.artists.items;
}

export async function searchAlbums(query: string, limit = 5) {
  const data = await spotifyFetch<{ albums: { items: SpotifyAlbum[] } }>("/search", {
    q: query,
    type: "album",
    market: "US",
    limit: String(limit)
  });
  return data.albums.items;
}

export async function getSpotifyArtist(artistId: string) {
  return spotifyFetch<SpotifyArtist>(`/artists/${artistId}`);
}

function normalizeAlbumNameForDedup(name: string) {
  return name
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s*-\s*(deluxe|expanded|remaster(ed)?|version.*)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeArtistAlbums(albums: SpotifyAlbum[]) {
  const uniqueByName = new Map<string, SpotifyAlbum>();
  for (const album of albums) {
    const key = normalizeAlbumNameForDedup(album.name);
    const existing = uniqueByName.get(key);
    if (!existing) {
      uniqueByName.set(key, album);
      continue;
    }

    // Prefer full albums, then newer release date, then higher track count.
    const existingScore =
      (existing.album_type === "album" ? 100 : 0) +
      Number.parseInt(existing.release_date.replace(/-/g, ""), 10) / 100000000 +
      existing.total_tracks / 1000;
    const currentScore =
      (album.album_type === "album" ? 100 : 0) +
      Number.parseInt(album.release_date.replace(/-/g, ""), 10) / 100000000 +
      album.total_tracks / 1000;
    if (currentScore > existingScore) {
      uniqueByName.set(key, album);
    }
  }
  return [...uniqueByName.values()];
}

export async function getSpotifyArtistAlbums(artistId: string) {
  // Spotify artists/{id}/albums requires limit to be a valid integer (1-50).
  const rawLimit = 20;
  const safeLimit = Number.isInteger(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 20;

  const data = await spotifyFetch<{ items: SpotifyAlbum[] }>(`/artists/${artistId}/albums`, {
    market: "US",
    include_groups: "album,single",
    limit: String(safeLimit)
  });
  const filtered = data.items.filter((album) => album.album_type === "album" || album.album_type === "single");
  return dedupeArtistAlbums(filtered);
}

export async function getSpotifyAlbum(albumId: string) {
  return spotifyFetch<SpotifyAlbumDetail>(`/albums/${albumId}`, {
    market: "US"
  });
}

const PINNED_ALBUM_QUERIES = [
  "album:Hit Me Hard and Soft artist:Billie Eilish",
  "album:Renaissance artist:Beyonce",
  "album:When A Thought Grows Wings artist:Luna Li",
  "album:choke enough artist:Oklou",
  "album:Baby artist:Dijon",
  "album:Fancy That artist:PinkPantheress",
  "album:Brat artist:Charli XCX",
  "album:Imaginal Disk artist:Magdalena Bay"
];

export async function getSpotifyCuratedAlbums(limit = 8) {
  const settled = await Promise.allSettled(
    PINNED_ALBUM_QUERIES.map(async (query) => {
      const pinnedResults = await searchAlbums(query, 1);
      const album = pinnedResults[0];
      return album?.images.length ? album : null;
    })
  );

  const pinnedAlbums: SpotifyAlbum[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      pinnedAlbums.push(result.value);
      return;
    }
    if (result.status === "rejected") {
      console.warn(`Pinned album fetch failed: ${PINNED_ALBUM_QUERIES[index]}`, result.reason);
    }
  });

  const unique = new Map<string, SpotifyAlbum>();
  for (const pinnedAlbum of pinnedAlbums) {
    unique.set(pinnedAlbum.id, pinnedAlbum);
  }

  const sorted = [...unique.values()].sort((a, b) => b.release_date.localeCompare(a.release_date));
  const pinnedIds = new Set(pinnedAlbums.map((album) => album.id));
  const withoutPinned = sorted.filter((album) => !pinnedIds.has(album.id));
  return [...pinnedAlbums, ...withoutPinned].slice(0, limit);
}
