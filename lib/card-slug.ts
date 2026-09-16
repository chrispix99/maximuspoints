/**
 * URL slugs for per-card review pages (/cards/[slug]).
 * Slugs are derived deterministically from card names; collisions get a
 * numeric suffix. The same function is used by generateStaticParams,
 * the page lookup, and internal links so they can never disagree.
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { slugify } from "./slugify";

export { slugify };

/** All card names from the research JSON (build-safe, no DB needed). */
export function allCardNamesFromJson(): string[] {
  const dir = join(process.cwd(), "data");
  const names: string[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const parsed: unknown = JSON.parse(
      readFileSync(join(dir, file), "utf8"),
    );
    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed as { cards?: unknown[] }).cards ?? [];
    for (const raw of arr as { name?: unknown }[]) {
      const name = String(raw?.name ?? "").trim();
      if (name) names.push(name);
    }
  }
  // Dedupe case-insensitively, matching seed behavior (first file wins).
  const seen = new Set<string>();
  return names.filter((n) => {
    const key = n.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Map every card name to a unique slug. */
export function buildSlugMap(names: string[]): Map<string, string> {
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const name of names) {
    const base = slugify(name) || "card";
    let slug = base;
    let i = 2;
    while (used.has(slug)) {
      slug = `${base}-${i}`;
      i++;
    }
    used.add(slug);
    map.set(name, slug);
  }
  return map;
}

/** Reverse lookup: slug -> card name. */
export function nameForSlug(
  slug: string,
  names: string[],
): string | undefined {
  const map = buildSlugMap(names);
  for (const [name, s] of map) {
    if (s === slug) return name;
  }
  return undefined;
}
