import Link from "next/link";
import { VibeRater } from "@/components/vibe-rater";
import { notFound } from "next/navigation";
import { getAlbumAverageRating, getAlbumDetailCacheFirst } from "@/lib/supabase-cache";

type Props = {
  params: { id: string };
};

export default async function RatePage({ params }: Props) {
  let album: Awaited<ReturnType<typeof getAlbumDetailCacheFirst>> | null = null;
  try {
    album = await getAlbumDetailCacheFirst(params.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Spotify API error: 404")) {
      return notFound();
    }
    return (
      <main className="mx-auto min-h-screen w-[min(980px,92vw)] py-16">
        <div className="glass rounded-2xl p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Album Unavailable</p>
          <h1 className="mt-3 text-2xl font-bold">打分页暂时无法加载</h1>
          <p className="mt-3 text-sm text-zinc-300">当前可能遇到 Spotify 限流（429）或短暂网络问题。请稍后重试。</p>
          <p className="mt-2 text-xs text-zinc-500">{message}</p>
          <div className="mt-6 flex gap-3">
            <Link href="/" className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
              返回首页
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!album) return notFound();
  const averageScore = await getAlbumAverageRating(params.id);

  const primaryArtist = album.artists[0];

  return (
    <main className="vibe-glow-bg min-h-screen">
      <div className="mx-auto w-[min(1200px,92vw)] py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="rounded-full bg-white/10 px-4 py-1.5 text-sm hover:bg-white/20">
            首页
          </Link>
          <Link
            href={primaryArtist?.id ? `/artist/${primaryArtist.id}` : "/"}
            className="rounded-full bg-white/10 px-4 py-1.5 text-sm hover:bg-white/20"
          >
            艺人页
          </Link>
        </div>
        <VibeRater
          album={{
            id: album.id,
            title: album.name,
            coverUrl: album.images[0]?.url ?? "",
            artistName: album.artists.map((a) => a.name).join(", "),
            releaseDate: album.release_date,
            tracks: album.tracks.items
          }}
          initialAverageScore={averageScore}
        />
      </div>
    </main>
  );
}
