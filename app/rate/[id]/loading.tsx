"use client";

import { motion } from "framer-motion";

export default function LoadingRatePage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="vibe-glow-bg flex min-h-screen items-center justify-center"
    >
      <div className="glass rounded-2xl px-8 py-6 text-center">
        <motion.div
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="text-sm text-zinc-300"
        >
          正在加载专辑氛围...
        </motion.div>
      </div>
    </motion.div>
  );
}
