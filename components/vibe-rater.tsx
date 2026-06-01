"use client";

import { FastAverageColor } from "fast-average-color";
import { Download, Flame, Heart, LoaderCircle, Plus, SkipForward, Cloud, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SpotifyAlbumTrack } from "@/lib/spotify";
import { scoreToLabel, withOpacity } from "@/lib/color";

type RateAlbum = {
  id: string;
  title: string;
  coverUrl: string;
  artistName: string;
  releaseDate: string;
  tracks: SpotifyAlbumTrack[];
};

type Props = {
  album: RateAlbum;
};

type VibeValues = {
  production: number;
  songwriting: number;
};

type TrackMood = "favorite" | "banger" | "vibe" | "skip";

const TRACK_MOODS: Array<{
  id: TrackMood;
  label: string;
  icon: ReactNode;
  textClass: string;
  glowClass: string;
}> = [
  {
    id: "favorite",
    label: "最爱",
    icon: (
      <>
        <Heart size={14} />
        <span>最爱</span>
      </>
    ),
    textClass: "text-rose-300",
    glowClass: "shadow-[0_0_14px_rgba(251,113,133,0.35)]"
  },
  {
    id: "banger",
    label: "炸裂",
    icon: (
      <>
        <Flame size={14} />
        <span>炸裂</span>
      </>
    ),
    textClass: "text-orange-300",
    glowClass: "shadow-[0_0_14px_rgba(251,146,60,0.35)]"
  },
  {
    id: "vibe",
    label: "氛围",
    icon: (
      <>
        <Cloud size={14} />
        <span>氛围</span>
      </>
    ),
    textClass: "text-sky-300",
    glowClass: "shadow-[0_0_14px_rgba(56,189,248,0.35)]"
  },
  {
    id: "skip",
    label: "跳过",
    icon: (
      <>
        <SkipForward size={14} />
        <span>跳过</span>
      </>
    ),
    textClass: "text-zinc-300",
    glowClass: "shadow-[0_0_12px_rgba(161,161,170,0.3)]"
  }
];

const fac = new FastAverageColor();
const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80";
const NOISE_TEXTURE_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 124, g: 58, b: 237 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function getLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function blendHex(hex: string, target: "white" | "black", amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const p = Math.max(0, Math.min(1, amount));
  const tr = target === "white" ? 255 : 0;
  const tg = target === "white" ? 255 : 0;
  const tb = target === "white" ? 255 : 0;
  const nr = Math.round(r + (tr - r) * p);
  const ng = Math.round(g + (tg - g) * p);
  const nb = Math.round(b + (tb - b) * p);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

export function VibeRater({ album }: Props) {
  const [mainScore, setMainScore] = useState(8.0);
  const [reviewText, setReviewText] = useState("");
  const [vibes, setVibes] = useState<VibeValues>({
    production: 82,
    songwriting: 84
  });
  const [themeColor, setThemeColor] = useState("#7c3aed");
  const [themeColorDark, setThemeColorDark] = useState("#3b146f");
  const [exporting, setExporting] = useState(false);
  const [trackMoodMap, setTrackMoodMap] = useState<Record<string, TrackMood | undefined>>({});
  const [hoverTriggerTrackKey, setHoverTriggerTrackKey] = useState<string | null>(null);
  const [openTrackPickerKey, setOpenTrackPickerKey] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const safeCoverUrl = album.coverUrl.includes("i.scdn.co")
    ? `/api/spotify-image?url=${encodeURIComponent(album.coverUrl)}`
    : album.coverUrl || FALLBACK_COVER;

  useEffect(() => {
    if (!safeCoverUrl) {
      document.documentElement.style.setProperty("--album-theme-color", "#7c3aed");
      return;
    }
    fac
      .getColorAsync(safeCoverUrl, { mode: "speed" })
      .then((res) => {
        setThemeColor(res.hex);
        setThemeColorDark(res.isDark ? "#f8fafc" : "#120a20");
        document.documentElement.style.setProperty("--album-theme-color", res.hex);
      })
      .catch(() => {
        document.documentElement.style.setProperty("--album-theme-color", "#7c3aed");
      });
    return () => {
      document.documentElement.style.setProperty("--album-theme-color", "#7c3aed");
    };
  }, [album.coverUrl, safeCoverUrl]);

  const finalScore = useMemo(() => {
    const fine = (vibes.production + vibes.songwriting) / 20;
    return Number(((mainScore * 0.7 + fine * 0.3) * 1).toFixed(1));
  }, [mainScore, vibes]);

  const scoreTone = useMemo(() => {
    const luminance = getLuminance(themeColor);
    const textColor = luminance < 135 ? blendHex(themeColor, "white", 0.68) : blendHex(themeColor, "black", 0.62);
    const ringColor =
      luminance < 135
        ? withOpacity(blendHex(themeColor, "white", 0.48), 0.72)
        : withOpacity(blendHex(themeColor, "black", 0.45), 0.6);
    const glowColor =
      luminance < 135
        ? withOpacity(blendHex(themeColor, "white", 0.42), 0.32)
        : withOpacity(blendHex(themeColor, "black", 0.45), 0.25);
    return { textColor, ringColor, glowColor };
  }, [themeColor]);

  function updateVibe<K extends keyof VibeValues>(key: K, value: number) {
    setVibes((v) => ({ ...v, [key]: value }));
  }

  function handleMainScoreWheel(e: React.WheelEvent<HTMLInputElement>) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const next = Math.max(0, Math.min(10, Number((mainScore + delta).toFixed(1))));
    setMainScore(next);
  }

  function setTrackMood(trackKey: string, mood?: TrackMood) {
    setTrackMoodMap((prev) => ({
      ...prev,
      [trackKey]: mood
    }));
  }

  async function exportCard() {
    if (!cardRef.current) return;
    try {
      setExporting(true);
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${album.title.replace(/\s+/g, "-").toLowerCase()}-vibe-card.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr] xl:items-stretch">
      <section className="glass h-full rounded-2xl p-5 md:p-8 xl:order-2">
        <div className="mb-6 flex items-center gap-4">
          <Image
            src={safeCoverUrl}
            alt={album.title}
            width={110}
            height={110}
            className="rounded-xl object-cover"
            unoptimized
          />
          <div>
            <h2 className="text-2xl font-semibold">{album.title}</h2>
            <p className="text-zinc-300">{album.artistName}</p>
            <p className="mt-2 text-sm text-zinc-400">Release Date: {album.releaseDate}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="rounded-xl border border-white/10 bg-white/5 p-4">
            <span className="text-sm text-white">Main Score</span>
            <div className="mt-2 flex items-end">
              <input
                type="number"
                step={0.1}
                min={0}
                max={10}
                value={mainScore}
                onWheel={handleMainScoreWheel}
                onChange={(e) => setMainScore(Number(e.target.value))}
                className="no-spin h-[48px] w-full bg-transparent text-5xl font-black leading-none outline-none"
              />
            </div>
          </label>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white">Final Score</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-5xl font-black leading-none">{finalScore}</p>
              <p className="pb-1 text-sm text-zinc-300">{scoreToLabel(finalScore)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {(["production", "songwriting"] as const).map((k) => (
            <label key={k} className="block">
              <div className="mb-2 flex justify-between text-sm text-zinc-300">
                <span className="capitalize">{k}</span>
                <span>{vibes[k]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={vibes[k]}
                onChange={(e) => updateVibe(k, Number(e.target.value))}
                style={{
                  accentColor: themeColor
                }}
                className="h-2 w-full cursor-pointer rounded-lg bg-zinc-700"
              />
            </label>
          ))}
        </div>

        <div className="mt-10">
          <p className="mb-3 text-sm font-medium text-zinc-200">Track List</p>
          <div className="hide-scrollbar max-h-64 space-y-2 overflow-auto pr-1">
            {album.tracks.map((track) => (
              (() => {
                const trackKey = track.id ?? `${track.track_number}-${track.name}`;
                const selectedMood = trackMoodMap[trackKey];
                const selectedMoodMeta = TRACK_MOODS.find((item) => item.id === selectedMood);
                const isPickerVisible =
                  hoverTriggerTrackKey === trackKey || openTrackPickerKey === trackKey;
                const selectedTriggerIcon =
                  selectedMood === "favorite" ? (
                    <Heart size={14} />
                  ) : selectedMood === "banger" ? (
                    <Flame size={14} />
                  ) : selectedMood === "vibe" ? (
                    <Cloud size={14} />
                  ) : selectedMood === "skip" ? (
                    <SkipForward size={14} />
                  ) : (
                    <Plus size={14} />
                  );

                return (
                  <div
                    key={trackKey}
                    className="relative flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      {track.track_number}. {track.name}
                    </span>

                    <div
                      className="relative ml-3 flex items-center"
                      onMouseEnter={() => setHoverTriggerTrackKey(trackKey)}
                      onMouseLeave={() => {
                        setHoverTriggerTrackKey((prev) => (prev === trackKey ? null : prev));
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenTrackPickerKey((prev) => (prev === trackKey ? null : trackKey))
                        }
                        className={`flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 transition ${
                          selectedMoodMeta
                            ? `${selectedMoodMeta.textClass} ${selectedMoodMeta.glowClass}`
                            : "text-zinc-400/80 hover:text-zinc-200"
                        }`}
                        aria-label="设置曲目情绪评价"
                      >
                        {selectedTriggerIcon}
                      </button>

                      <AnimatePresence>
                        {isPickerVisible ? (
                          <motion.div
                            initial={{ opacity: 0, x: 8, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 8, scale: 0.98 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="absolute right-10 top-1/2 z-20 -translate-y-1/2 rounded-xl border border-white/10 bg-zinc-900/90 p-1.5 shadow-2xl backdrop-blur-md"
                          >
                            <div className="flex items-center gap-1">
                              {TRACK_MOODS.map((mood) => (
                                <button
                                  key={mood.id}
                                  type="button"
                                  onClick={() => {
                                    setTrackMood(trackKey, mood.id);
                                    setOpenTrackPickerKey(null);
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition hover:bg-white/10 ${mood.textClass} ${
                                    selectedMood === mood.id ? mood.glowClass : ""
                                  }`}
                                >
                                  {mood.icon}
                                </button>
                              ))}
                              {selectedMood ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTrackMood(trackKey, undefined);
                                    setOpenTrackPickerKey(null);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-300 transition hover:bg-white/10"
                                >
                                  <X size={13} />
                                </button>
                              ) : null}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })()
            ))}
          </div>
        </div>
      </section>

      <section className="flex h-full flex-col gap-4 xl:order-1">
        <div
          ref={cardRef}
          className="relative flex min-h-[640px] flex-col overflow-hidden rounded-3xl p-6 xl:flex-1"
          style={{
            background: `linear-gradient(155deg, ${withOpacity(themeColor, 0.82)} 0%, ${withOpacity(themeColorDark, 0.9)} 100%)`
          }}
        >
          <img
            src={safeCoverUrl}
            alt=""
            aria-hidden="true"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-[36px]"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/68" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at 18% 24%, ${withOpacity(themeColor, 0.34)} 0%, transparent 52%),
              radial-gradient(circle at 86% 8%, ${withOpacity(blendHex(themeColor, "black", 0.25), 0.26)} 0%, transparent 45%)`
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url("${NOISE_TEXTURE_DATA_URI}")`,
              backgroundSize: "180px 180px",
              opacity: 0.03
            }}
          />

          <div className="relative z-10 mx-auto flex w-full max-w-[560px] items-center justify-center gap-8 pt-2 sm:gap-10">
            <img
              src={safeCoverUrl}
              alt={album.title}
              width={220}
              height={220}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              className="h-[160px] w-[160px] rounded-2xl object-cover shadow-[0_16px_42px_-18px_rgba(0,0,0,0.9)] sm:h-[190px] sm:w-[190px]"
            />
            <div
              className="inline-flex h-[156px] w-[156px] items-center justify-center rounded-full"
              style={{
                borderWidth: "4px",
                borderStyle: "solid",
                borderColor: "rgba(255,255,255,0.95)"
              }}
            >
              <p
                className="text-[64px] font-black leading-none sm:text-[70px]"
                style={{
                  color: "#ffffff",
                  textShadow: `0 2px 12px ${withOpacity("#000000", 0.28)}`
                }}
              >
                {finalScore}
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-7 flex w-full min-w-0 flex-col gap-6">
            <div className="w-full min-w-0">
              <p className="text-[34px] font-semibold leading-tight tracking-[0.01em]">{album.title}</p>
              <p className="mt-1 text-base text-white/80">{album.artistName}</p>
            </div>
            <p className="w-full min-w-0 whitespace-pre-wrap break-all [overflow-wrap:anywhere] text-[17px] leading-8 tracking-[0.012em] text-white/92">
              {reviewText.trim() || "期待你的乐评"}
            </p>
          </div>
          <p className="relative z-10 mt-auto pt-6 text-[9px] uppercase tracking-[0.24em] text-white/55">
            Generated by Vibe Music System
          </p>
        </div>

        <div className="glass rounded-xl p-3">
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-300">Review</p>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="写下你的听感、最喜欢的段落、情绪关键词..."
            className="h-24 w-full resize-none bg-transparent px-0 py-1 text-sm text-zinc-100 outline-none"
          />
        </div>

        <button
          onClick={exportCard}
          className="glass inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-white/15 disabled:opacity-60"
          disabled={exporting}
        >
          {exporting ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}
          导出 Vibe Card (PNG)
        </button>
      </section>
    </div>
  );
}
