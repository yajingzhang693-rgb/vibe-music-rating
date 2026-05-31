export function withOpacity(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return `rgba(124,58,237,${alpha})`;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function scoreToLabel(score: number) {
  if (score >= 9.5) return "Masterpiece";
  if (score >= 8.5) return "Excellent";
  if (score >= 7) return "Solid";
  if (score >= 5) return "Mixed";
  return "Not for me";
}
