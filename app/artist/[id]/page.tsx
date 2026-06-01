import Link from "next/link";
import { notFound } from "next/navigation";
import { searchAlbums } from "@/lib/spotify";
import { ArtistAlbumRow } from "@/components/artist-album-row";
import { getArtistPageCacheFirst } from "@/lib/supabase-cache";

type Props = {
  params: { id: string };
};

function sortAlbumsByDateDesc<T extends { release_date: string }>(albums: T[]) {
  return [...albums].sort((a, b) => b.release_date.localeCompare(a.release_date));
}

export default async function ArtistPage({ params }: Props) {
  let artist: Awaited<ReturnType<typeof getArtistPageCacheFirst>>["artist"] | null = null;
  let artistAlbums: Awaited<ReturnType<typeof getArtistPageCacheFirst>>["albums"] = [];
  let artistError: string | null = null;
  let albumsError: string | null = null;
  let albumsStaleAt: string | null = null;

  try {
    const data = await getArtistPageCacheFirst(params.id);
    artist = data.artist;
    artistAlbums = sortAlbumsByDateDesc(data.albums);
    albumsStaleAt = data.staleUpdatedAt;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Spotify API error: 404")) {
      return notFound();
    }
    artistError = message;
  }

  if (!artist) {
    return (
      <main className="mx-auto min-h-screen w-[min(980px,92vw)] py-16">
        <div className="glass rounded-2xl p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Artist Unavailable</p>
          <h1 className="mt-3 text-2xl font-bold">艺人页暂时无法加载</h1>
          <p className="mt-3 text-sm text-zinc-300">
            当前可能遇到 Spotify 限流（429）或短暂网络问题。请稍后重试。
          </p>
          <p className="mt-2 text-xs text-zinc-500">{artistError}</p>
          <div className="mt-6 flex gap-3">
            <Link href="/" className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
              返回首页
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!artistAlbums.length) {
    try {
      const searched = await searchAlbums(`artist:${artist.name}`, 30);
      const matched = searched.filter((album) => album.artists.some((a) => a.id === params.id));
      if (matched.length > 0) {
        artistAlbums = sortAlbumsByDateDesc(matched);
      } else {
        albumsError = "No albums found";
      }
    } catch (error) {
      albumsError = error instanceof Error ? error.message : "Unknown error";
    }
  }

  const heroImage =
    artist.images?.[0]?.url ??
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80";

  return (
    <main className="min-h-screen md:grid md:grid-cols-[0.9fr_1.1fr]">
      <section className="relative h-[42vh] md:sticky md:top-0 md:h-screen">
        <img src={heroImage} alt={artist.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/90 md:bg-gradient-to-r md:from-black/30 md:to-black/80" />
        <div className="absolute left-6 top-6 md:left-10 md:top-8">
          <Link
            href="/"
            className="inline-block rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 md:text-base"
          >
            返回首页
          </Link>
        </div>
        <div className="absolute bottom-8 left-6 right-6 md:left-10 md:right-10">
          <h1 className="text-4xl font-black md:text-7xl">{artist.name}</h1>
        </div>
      </section>

      <section className="px-6 py-8 md:px-10">
        <h2 className="mb-5 text-base font-semibold uppercase tracking-[0.16em] text-zinc-300">Albums</h2>
        {albumsError ? (
          <div className="glass rounded-xl px-4 py-4 text-sm text-zinc-300">
            专辑列表暂时加载失败，请稍后重试。
            <p className="mt-1 text-xs text-zinc-500">{albumsError}</p>
          </div>
        ) : (
          <>
            {albumsStaleAt ? (
              <p className="mb-3 text-xs text-zinc-500">
                当前显示缓存专辑（更新时间：{new Date(albumsStaleAt).toLocaleString()}）。
              </p>
            ) : null}
            <div className="space-y-3">
              {artistAlbums.map((album) => (
                <ArtistAlbumRow
                  key={album.id}
                  albumId={album.id}
                  albumName={album.name}
                  releaseDate={album.release_date}
                  coverUrl={
                    album.images[0]?.url ??
                    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=300&q=80"
                  }
                  artistsLabel={album.artists.map((a) => a.name).join(", ")}
                  spotifyUrl={album.external_urls?.spotify}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
