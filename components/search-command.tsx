"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";

type SearchArtist = {
  id: string;
  name: string;
  imageUrl: string | null;
  genres?: string[];
  popularity: number;
};

function normalizeForSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [artists, setArtists] = useState<SearchArtist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const query = keyword.trim();
    if (!query) {
      setArtists([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        if (!res.ok) {
          setArtists([]);
          return;
        }
        const data = (await res.json()) as { artists?: unknown[] };
        const queryLower = normalizeForSearch(query);
        const candidates: SearchArtist[] = (data.artists ?? [])
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item) => ({
            id: String(item.id ?? ""),
            name: String(item.name ?? "Unknown artist"),
            imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
            genres: Array.isArray(item.genres) ? item.genres.filter((g): g is string => typeof g === "string") : [],
            popularity: typeof item.popularity === "number" ? item.popularity : 0
          }))
          .filter((item) => item.id.length > 0);

        const ranked = candidates
          .filter((item) => normalizeForSearch(item.name).includes(queryLower))
          .sort((a, b) => {
            const aName = normalizeForSearch(a.name);
            const bName = normalizeForSearch(b.name);
            const aStarts = aName.startsWith(queryLower);
            const bStarts = bName.startsWith(queryLower);
            if (aStarts !== bStarts) return aStarts ? -1 : 1;
            return b.popularity - a.popularity;
          })
          .slice(0, 5);

        setArtists(
          ranked.length > 0
            ? ranked
            : [...candidates].sort((a, b) => b.popularity - a.popularity).slice(0, 5)
        );
      } catch {
        setArtists([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword]);

  return (
    <div className="w-full">
      <button
        className="glass flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-zinc-300 transition hover:bg-white/10"
        onClick={() => setOpen(true)}
      >
        <Search size={16} />
        搜索艺人...
        <span className="ml-auto rounded bg-white/10 px-2 py-0.5 text-xs">Cmd/Ctrl + K</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto mt-20 w-[min(980px,94vw)] rounded-2xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2"
              autoFocus
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="输入艺人名，实时搜索 Spotify..."
            />
            <div className="mt-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Artists (Top 5)</div>
              <div className="space-y-2">
                {loading ? <p className="px-3 py-2 text-sm text-zinc-400">搜索中...</p> : null}
                {!loading && keyword.trim() && artists.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-zinc-400">未找到艺人</p>
                ) : null}
                {!keyword.trim() ? <p className="px-3 py-2 text-sm text-zinc-400">输入关键词开始搜索</p> : null}
                {artists.map((artist) => (
                  (() => {
                    const genresText = Array.isArray(artist.genres)
                      ? artist.genres.slice(0, 2).join(" · ")
                      : "";
                    return (
                  <Link
                    key={artist.id}
                    href={`/artist/${artist.id}`}
                    className="flex items-center gap-4 rounded-xl px-4 py-3 text-base text-zinc-100 hover:bg-white/10"
                    onClick={() => setOpen(false)}
                  >
                    {artist.imageUrl ? (
                      <Image
                        src={artist.imageUrl}
                        alt={artist.name}
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-2xl font-semibold leading-tight">{artist.name}</p>
                      {genresText ? <p className="truncate pt-1 text-sm text-zinc-400">{genresText}</p> : null}
                    </div>
                  </Link>
                    );
                  })()
                ))}
              </div>
            </div>
            <div className="mt-4 text-right">
              <button
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/20"
                onClick={() => setOpen(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
