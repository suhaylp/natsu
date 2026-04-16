const countryReplacements: Array<[RegExp, string]> = [
  [/\bTail[aâ]ndia\b/gi, 'Thailand'],
  [/\bTailandia\b/gi, 'Thailand'],
  [/\bVietn[aã]\b/gi, 'Vietnam'],
  [/\bJap[aã]o\b/gi, 'Japan'],
  [/\bCanad[aá]\b/gi, 'Canada'],
  [/\bSingapura\b/gi, 'Singapore'],
];

function normalizeSegment(segment: string): string {
  let normalized = segment.trim();
  for (const [pattern, replacement] of countryReplacements) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

export function normalizeLocationText(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/[|·]/g, ',');
  const parts = normalized
    .split(',')
    .map((part) => normalizeSegment(part))
    .filter(Boolean);

  const deduped: string[] = [];
  for (const part of parts) {
    if (!deduped.some((existing) => existing.toLowerCase() === part.toLowerCase())) {
      deduped.push(part);
    }
  }

  return deduped.join(', ');
}
