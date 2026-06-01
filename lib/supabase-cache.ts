import type { SpotifyAlbum, SpotifyAlbumDetail, SpotifyArtist } from "@/lib/spotify";
import { getSpotifyAlbum, getSpotifyArtist, getSpotifyArtistAlbums, getSpotifyCuratedAlbums } from "@/lib/spotify";
import { getSupabaseServerClient } from "@/lib/supabase";

const HOME_CACHE_TTL_MS = 60 * 60 * 1000;
const ARTIST_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ALBUM_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type DbAlbumRow = {
  spotify_id: string;
  name: string;
  cover_url: string | null;
  artist_name: string;
  artists: unknown;
  release_date: string | null;
  tracks: unknown;
  updated_at: string;
};

type DbArtistRow = {
  spotify_id: string;
  name: string;
  image_url: string | null;
  genres: string[] | null;
  popularity: number | null;
  albums_snapshot: unknown;
  updated_at: string;
};

function isFresh(updatedAt: string | null | undefined, ttlMs: number) {
  if (!updatedAt) return false;
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= ttlMs;
}

function mapAlbumToCard(row: DbAlbumRow) {
  return {
    id: row.spotify_id,
    title: row.name,
    coverUrl: row.cover_url ?? "",
    artistName: row.artist_name
  };
}

function mapSpotifyAlbumToDb(album: SpotifyAlbum) {
  return {
    spotify_id: album.id,
    name: album.name,
    cover_url: album.images[0]?.url ?? null,
    artist_name: album.artists.map((artist) => artist.name).join(", "),
    artists: album.artists,
    release_date: album.release_date ?? null,
    tracks: [],
    updated_at: new Date().toISOString()
  };
}

function mapSpotifyAlbumDetailToDb(album: SpotifyAlbumDetail) {
  return {
    spotify_id: album.id,
    name: album.name,
    cover_url: album.images[0]?.url ?? null,
    artist_name: album.artists.map((artist) => artist.name).join(", "),
    artists: album.artists,
    release_date: album.release_date ?? null,
    tracks: album.tracks.items,
    updated_at: new Date().toISOString()
  };
}

export async function getHomepageAlbumsCacheFirst() {
  const supabase = getSupabaseServerClient();
  const { data: cached, error: cachedError } = await supabase
    .from("albums")
    .select("spotify_id,name,cover_url,artist_name,artists,release_date,tracks,updated_at")
    .order("updated_at", { ascending: false })
    .limit(8);
  if (cachedError) {
    console.error("Supabase Error details:", cachedError);
  }

  if (!cachedError && cached && cached.length >= 8 && cached.every((row) => isFresh(row.updated_at, HOME_CACHE_TTL_MS))) {
    return {
      albums: cached.map(mapAlbumToCard),
      updatedAt: cached[0]?.updated_at ?? null,
      fromCache: true
    };
  }

  const fallbackCached = cached && cached.length > 0 ? cached : [];
  try {
    const spotifyAlbums = await getSpotifyCuratedAlbums(8);
    if (spotifyAlbums.length === 0) {
      throw new Error("Spotify curated query returned an empty list");
    }
    const rows = spotifyAlbums.map(mapSpotifyAlbumToDb);
    if (rows.length > 0) {
      const { error: upsertError } = await supabase.from("albums").upsert(rows, { onConflict: "spotify_id" });
      if (upsertError) {
        console.error("Supabase Error details:", upsertError);
        console.error("Failed to upsert homepage albums:", upsertError.message);
      }
    }
    return {
      albums: spotifyAlbums.map((album) => ({
        id: album.id,
        title: album.name,
        coverUrl: album.images[0]?.url ?? "",
        artistName: album.artists.map((artist) => artist.name).join(", ")
      })),
      updatedAt: new Date().toISOString(),
      fromCache: false
    };
  } catch (error) {
    if (fallbackCached.length > 0) {
      return {
        albums: fallbackCached.map(mapAlbumToCard),
        updatedAt: fallbackCached[0]?.updated_at ?? null,
        fromCache: true
      };
    }
    throw error;
  }
}

export async function getArtistPageCacheFirst(artistId: string) {
  const supabase = getSupabaseServerClient();
  const { data: cached, error: cachedError } = await supabase
    .from("artists")
    .select("spotify_id,name,image_url,genres,popularity,albums_snapshot,updated_at")
    .eq("spotify_id", artistId)
    .maybeSingle();
  if (cachedError) {
    console.error("Supabase Error details:", cachedError);
  }
  const cachedArtist = cached as DbArtistRow | null;

  const cachedAlbums = Array.isArray(cachedArtist?.albums_snapshot) ? (cachedArtist?.albums_snapshot as SpotifyAlbum[]) : [];
  if (!cachedError && cachedArtist && isFresh(cachedArtist.updated_at, ARTIST_CACHE_TTL_MS) && cachedAlbums.length > 0) {
    return {
      artist: {
        id: cachedArtist.spotify_id,
        name: cachedArtist.name,
        genres: cachedArtist.genres ?? [],
        popularity: cachedArtist.popularity ?? 0,
        images: cachedArtist.image_url ? [{ url: cachedArtist.image_url, width: null, height: null }] : [],
        external_urls: {}
      } satisfies SpotifyArtist,
      albums: cachedAlbums,
      staleUpdatedAt: null
    };
  }

  try {
    const [artist, albums] = await Promise.all([getSpotifyArtist(artistId), getSpotifyArtistAlbums(artistId)]);
    const { error: upsertError } = await supabase.from("artists").upsert(
      {
        spotify_id: artist.id,
        name: artist.name,
        image_url: artist.images[0]?.url ?? null,
        genres: artist.genres,
        popularity: artist.popularity,
        albums_snapshot: albums,
        updated_at: new Date().toISOString()
      },
      { onConflict: "spotify_id" }
    );
    if (upsertError) {
      console.error("Supabase Error details:", upsertError);
      console.error("Failed to upsert artist snapshot:", upsertError.message);
    }

    if (albums.length > 0) {
      const albumRows = albums.map(mapSpotifyAlbumToDb);
      const { error: albumUpsertError } = await supabase.from("albums").upsert(albumRows, { onConflict: "spotify_id" });
      if (albumUpsertError) {
        console.error("Supabase Error details:", albumUpsertError);
        console.error("Failed to upsert artist albums into cache:", albumUpsertError.message);
      }
    }

    return {
      artist,
      albums,
      staleUpdatedAt: null
    };
  } catch (error) {
    if (cachedArtist && cachedAlbums.length > 0) {
      return {
        artist: {
          id: cachedArtist.spotify_id,
          name: cachedArtist.name,
          genres: cachedArtist.genres ?? [],
          popularity: cachedArtist.popularity ?? 0,
          images: cachedArtist.image_url ? [{ url: cachedArtist.image_url, width: null, height: null }] : [],
          external_urls: {}
        } satisfies SpotifyArtist,
        albums: cachedAlbums,
        staleUpdatedAt: cachedArtist.updated_at
      };
    }
    throw error;
  }
}

export async function getAlbumDetailCacheFirst(albumId: string) {
  const supabase = getSupabaseServerClient();
  const { data: cached, error: cachedError } = await supabase
    .from("albums")
    .select("spotify_id,name,cover_url,artist_name,artists,release_date,tracks,updated_at")
    .eq("spotify_id", albumId)
    .maybeSingle();
  if (cachedError) {
    console.error("Supabase Error details:", cachedError);
  }
  const cachedAlbum = cached as DbAlbumRow | null;

  const cachedArtists = Array.isArray(cachedAlbum?.artists)
    ? (cachedAlbum.artists as Array<{ id?: string; name?: string }>)
        .filter((artist) => typeof artist?.name === "string")
        .map((artist) => ({ id: typeof artist.id === "string" ? artist.id : "", name: artist.name as string }))
    : [];

  if (
    !cachedError &&
    cachedAlbum &&
    isFresh(cachedAlbum.updated_at, ALBUM_CACHE_TTL_MS) &&
    Array.isArray(cachedAlbum.tracks) &&
    cachedAlbum.tracks.length > 0
  ) {
    return {
      id: cachedAlbum.spotify_id,
      name: cachedAlbum.name,
      release_date: cachedAlbum.release_date ?? "",
      images: cachedAlbum.cover_url ? [{ url: cachedAlbum.cover_url, width: null, height: null }] : [],
      artists: cachedAlbum.artist_name
        ? cachedArtists.length > 0
          ? cachedArtists
          : cachedAlbum.artist_name
              .split(",")
              .map((name) => name.trim())
              .filter(Boolean)
              .map((name) => ({ id: "", name }))
        : [],
      tracks: { items: cachedAlbum.tracks as SpotifyAlbumDetail["tracks"]["items"] },
      external_urls: {}
    } satisfies SpotifyAlbumDetail;
  }

  try {
    const album = await getSpotifyAlbum(albumId);
    const { error: upsertError } = await supabase
      .from("albums")
      .upsert(mapSpotifyAlbumDetailToDb(album), { onConflict: "spotify_id" });
    if (upsertError) {
      console.error("Supabase Error details:", upsertError);
      console.error("Failed to upsert album detail cache:", upsertError.message);
    }
    return album;
  } catch (error) {
    if (cachedAlbum && Array.isArray(cachedAlbum.tracks)) {
      return {
        id: cachedAlbum.spotify_id,
        name: cachedAlbum.name,
        release_date: cachedAlbum.release_date ?? "",
        images: cachedAlbum.cover_url ? [{ url: cachedAlbum.cover_url, width: null, height: null }] : [],
        artists: cachedAlbum.artist_name
          ? cachedArtists.length > 0
            ? cachedArtists
            : cachedAlbum.artist_name
                .split(",")
                .map((name) => name.trim())
                .filter(Boolean)
                .map((name) => ({ id: "", name }))
          : [],
        tracks: { items: cachedAlbum.tracks as SpotifyAlbumDetail["tracks"]["items"] },
        external_urls: {}
      } satisfies SpotifyAlbumDetail;
    }
    throw error;
  }
}

export async function getAlbumAverageRating(albumId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("ratings").select("main_score").eq("album_id", albumId);
  if (error) {
    console.error("Supabase Error details:", error);
  }
  if (error || !data || data.length === 0) {
    return null;
  }
  const avg = data.reduce((sum, row) => sum + Number(row.main_score ?? 0), 0) / data.length;
  return Number(avg.toFixed(1));
}
