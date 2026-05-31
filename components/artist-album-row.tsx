"use client";

import { FastAverageColor } from "fast-average-color";
import { motion } from "framer-motion";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Props = {
  albumId: string;
  albumName: string;
  releaseDate: string;
  coverUrl: string;
  artistsLabel: string;
  spotifyUrl?: string;
};

const fac = new FastAverageColor();

function withOpacity(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return `rgba(124,58,237,${alpha})`;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ArtistAlbumRow({
  albumId,
  albumName,
  releaseDate,
  coverUrl,
  artistsLabel,
  spotifyUrl
}: Props) {
  const router = useRouter();
  const [glowHex, setGlowHex] = useState("#7c3aed");
  const safeCoverUrl = useMemo(
    () => (coverUrl.includes("i.scdn.co") ? `/api/spotify-image?url=${encodeURIComponent(coverUrl)}` : coverUrl),
    [coverUrl]
  );

  useEffect(() => {
    fac
      .getColorAsync(safeCoverUrl, { mode: "speed" })
      .then((result) => setGlowHex(result.hex))
      .catch(() => setGlowHex("#7c3aed"));
  }, [safeCoverUrl]);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/rate/${albumId}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/rate/${albumId}`);
        }
      }}
      className="glass will-change-auto grid cursor-pointer grid-cols-[80px_1fr_auto] items-center gap-4 rounded-xl bg-white/5 p-3 transition-[background-color,backdrop-filter,box-shadow] duration-200 ease-out hover:transform-gpu hover:will-change-transform"
      whileHover={{
        y: -4,
        scale: 1.02,
        backgroundColor: "rgba(255,255,255,0.10)",
        backdropFilter: "blur(12px)",
        boxShadow: `0 12px 34px -18px ${withOpacity(glowHex, 0.45)}`
      }}
      transition={{
        type: "spring",
        stiffness: 460,
        damping: 25,
        mass: 0.55,
        duration: 0.18,
        ease: "circOut"
      }}
      style={{ backfaceVisibility: "hidden" }}
    >
      <Image
        src={safeCoverUrl}
        alt={albumName}
        width={80}
        height={80}
        className="rounded-xl object-cover shadow-[0_6px_18px_rgba(0,0,0,0.28)]"
      />

      <div className="min-w-0">
        <p className="truncate font-medium">{albumName}</p>
        <p className="text-sm text-zinc-400">{artistsLabel}</p>
        <p className="mt-1 text-xs text-zinc-500">{releaseDate}</p>
      </div>

      <button
        type="button"
        aria-label="在 Spotify 打开专辑"
        onClick={(e) => {
          e.stopPropagation();
          if (spotifyUrl) {
            window.open(spotifyUrl, "_blank", "noopener,noreferrer");
          }
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-300 transition hover:border-[#1DB954] hover:text-[#1DB954]"
      >
        <ExternalLink size={16} />
      </button>
    </motion.div>
  );
}
