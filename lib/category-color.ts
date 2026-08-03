const FALLBACK_HUE = 220;

export function normalizeCategoryName(category?: string | null): string {
  if (typeof category !== "string") {
    return "";
  }

  return category.trim().replace(/\s+/g, " ");
}

function getCategoryHue(category: string): number {
  const normalized = normalizeCategoryName(category).toLowerCase();

  if (!normalized) {
    return FALLBACK_HUE;
  }

  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = normalized.charCodeAt(index) + ((hash << 5) - hash);
    hash |= 0;
  }

  return ((hash % 360) + 360) % 360;
}

export function getCategoryBadgeColors(category?: string | null) {
  const hue = getCategoryHue(category ?? "");

  return {
    backgroundColor: `hsl(${hue} 72% 94%)`,
    borderColor: `hsl(${hue} 48% 80%)`,
    color: `hsl(${hue} 34% 28%)`,
  };
}
