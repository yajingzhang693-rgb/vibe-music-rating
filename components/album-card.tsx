"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type AlbumCardData = {
  id: string;
  title: string;
  coverUrl: string;
  artistName: string;
  baseScore?: number;
};

type Props = {
  album: AlbumCardData;
};

export function AlbumCard({ album }: Props) {
  const fallbackCover =
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80";
  const [coverSrc, setCoverSrc] = useState(album.coverUrl);

  return (
    <Link href={`/rate/${album.id}`} className="group relative block overflow-hidden rounded-2xl">
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="relative">
        <Image
          src={coverSrc}
          alt={album.title}
          width={380}
          height={380}
          className="aspect-square w-full object-cover"
          onError={() => setCoverSrc(fallbackCover)}
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition delay-100 group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 translate-y-2 p-3 opacity-0 transition delay-100 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="truncate text-sm font-semibold">{album.title}</p>
          <p className="text-xs text-zinc-300">{album.baseScore ? `${album.artistName} · ${album.baseScore.toFixed(1)}` : album.artistName}</p>
        </div>
      </motion.div>
    </Link>
  );
}
