import { AlbumCard } from "@/components/album-card";
import { SearchCommand } from "@/components/search-command";
import { readCuratedSnapshot } from "@/lib/curated-cache";
import { headers } from "next/headers";

type HomeCuratedPayload = {
  ok: boolean;
  refreshedAt?: string;
  albums?: Array<{
    id: string;
    title: string;
    coverUrl: string;
    artistName: string;
  }>;
};

export default async function HomePage() {
  const snapshot = await readCuratedSnapshot();
  let curated = snapshot?.albums ?? [];
  let lastUpdated = snapshot?.updatedAt ?? null;
  let loadFailed = false;

  if (!snapshot) {
    try {
      const h = headers();
      const host = h.get("host");
      if (!host) {
        throw new Error("Missing host header");
      }
      const protocol = host.includes("localhost") ? "http" : "https";
      const response = await fetch(`${protocol}://${host}/api/cron/refresh-curated?public=1`, {
        next: { revalidate: 3600 }
      });
      if (!response.ok) {
        throw new Error(`Curated endpoint failed: ${response.status}`);
      }
      const payload = (await response.json()) as HomeCuratedPayload;
      curated = Array.isArray(payload.albums) ? payload.albums : [];
      lastUpdated = payload.refreshedAt ?? null;
    } catch {
      loadFailed = true;
    }
  }

  return (
    <main className="mx-auto min-h-screen w-[min(1200px,92vw)] py-10">
      <header className="mb-8 space-y-4">
        <p className="inline-block rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300">
          Discovery Hub
        </p>
        <h1 className="text-4xl font-black tracking-tight md:text-6xl">Vibe Music Rating</h1>
        <p className="max-w-xl text-zinc-300">
          极简、沉浸式音乐评价空间。输入你的感受，留下属于你的分数。
        </p>
        <SearchCommand />
      </header>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">编辑精选</h2>
          <span className="text-sm text-zinc-400">8 Albums</span>
        </div>
        {curated.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {curated.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        ) : loadFailed ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="glass h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl px-4 py-5 text-sm text-zinc-300">
            编辑精选暂未就绪。请先触发一次缓存刷新（Cron 或手动访问刷新接口）。
          </div>
        )}
        {lastUpdated ? (
          <p className="mt-3 text-xs text-zinc-500">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </p>
        ) : null}
      </section>
    </main>
  );
}
