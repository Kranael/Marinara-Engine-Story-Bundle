import type { GameNpc } from "@marinara-engine/shared";

export const BUILT_IN_MARI_AVATAR = "/sprites/mari/Mari_profile.png";

const CHARACTER_NAME_LEADING_PREFIX_WORDS = new Set([
  "a",
  "an",
  "the",
  "il",
  "lo",
  "la",
  "le",
  "l",
  "el",
  "sir",
  "lady",
  "lord",
  "professor",
  "old",
  "young",
  "elder",
  "great",
  "captain",
]);
const lookupCandidatesByMap = new WeakMap<Map<string, string>, Map<string, Set<string>>>();

export function normalizeAvatarLookupName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function nameLookupWithoutLeadingPrefix(normalizedName: string): string {
  const words = normalizedName.split(/\s+/).filter(Boolean);
  return words.length > 1 && CHARACTER_NAME_LEADING_PREFIX_WORDS.has(words[0]!)
    ? words.slice(1).join(" ")
    : normalizedName;
}

function primaryAvatarLookupAliases(value: string): string[] {
  const normalized = normalizeAvatarLookupName(value);
  const withoutLeadingPrefix = nameLookupWithoutLeadingPrefix(normalized);
  return Array.from(new Set([value.normalize("NFKC").trim().toLowerCase(), normalized, withoutLeadingPrefix])).filter(
    Boolean,
  );
}

function avatarLookupAliases(value: string): string[] {
  const normalized = normalizeAvatarLookupName(value);
  const words = normalized.split(/\s+/).filter(Boolean);
  return Array.from(
    new Set([
      ...primaryAvatarLookupAliases(value),
      ...words.filter((word) => word.length >= 3 && !CHARACTER_NAME_LEADING_PREFIX_WORDS.has(word)),
    ]),
  );
}

export function addNameLookupEntry(map: Map<string, string>, name: unknown, value: unknown): void {
  if (typeof name !== "string" || typeof value !== "string") return;
  const trimmedValue = value.trim();
  if (!trimmedValue) return;
  let candidatesByAlias = lookupCandidatesByMap.get(map);
  if (!candidatesByAlias) {
    candidatesByAlias = new Map();
    lookupCandidatesByMap.set(map, candidatesByAlias);
  }
  for (const alias of avatarLookupAliases(name)) {
    let candidates = candidatesByAlias.get(alias);
    if (!candidates) {
      candidates = new Set();
      const existing = map.get(alias);
      if (existing) candidates.add(existing);
      candidatesByAlias.set(alias, candidates);
    }
    candidates.add(trimmedValue);
    if (candidates.size === 1) map.set(alias, trimmedValue);
    else map.delete(alias);
  }
}

function containsLookupPhrase(value: string, phrase: string): boolean {
  return ` ${value} `.includes(` ${phrase} `);
}

/** Resolve title and partial-name aliases before creating a replacement portrait. */
export function findCharAvatarFuzzy(npcName: string, charAvatarByName: Map<string, string>): string | undefined {
  const exactCandidates = new Set<string>();
  const trackedCandidates = lookupCandidatesByMap.get(charAvatarByName);
  for (const alias of primaryAvatarLookupAliases(npcName)) {
    const candidates = trackedCandidates?.get(alias);
    if (candidates) {
      for (const candidate of candidates) exactCandidates.add(candidate);
    } else {
      const exact = charAvatarByName.get(alias);
      if (exact) exactCandidates.add(exact);
    }
  }
  if (exactCandidates.size > 0) return exactCandidates.size === 1 ? exactCandidates.values().next().value : undefined;

  // Fuzzy fallback: compare FULL names only, never single-word sub-aliases.
  // Matching on a shared word (e.g. "Mizuki" in "Mizuki Hoshikawa" vs
  // "Mizuki Kojima") wrongly links a generated NPC to an unrelated library
  // character. Only a single-word name may match a word inside a multi-word
  // name (e.g. "Oak" → "Professor Oak").
  const npcPrimary = primaryAvatarLookupAliases(npcName);
  const npcWords = normalizeAvatarLookupName(npcName).split(/\s+/).filter(Boolean);
  const npcIsSingleWord = npcWords.length === 1;

  const fuzzyCandidates = new Set<string>();
  for (const [charName, avatar] of charAvatarByName) {
    const charPrimary = primaryAvatarLookupAliases(charName);
    const charWords = normalizeAvatarLookupName(charName).split(/\s+/).filter(Boolean);
    const charIsSingleWord = charWords.length === 1;

    for (const npcAlias of npcPrimary) {
      for (const charAlias of charPrimary) {
        if (npcAlias === charAlias) {
          fuzzyCandidates.add(avatar);
          continue;
        }
        // Full-name phrase containment (word-boundary aware).
        if (charAlias.length >= 3 && containsLookupPhrase(npcAlias, charAlias)) fuzzyCandidates.add(avatar);
        if (npcAlias.length >= 3 && containsLookupPhrase(charAlias, npcAlias)) fuzzyCandidates.add(avatar);
      }
    }

    // Single-word name matching a word inside the other's full name.
    if (npcIsSingleWord && !charIsSingleWord) {
      const word = npcWords[0]!;
      if (word.length >= 3 && charWords.includes(word)) fuzzyCandidates.add(avatar);
    } else if (charIsSingleWord && !npcIsSingleWord) {
      const word = charWords[0]!;
      if (word.length >= 3 && npcWords.includes(word)) fuzzyCandidates.add(avatar);
    }
  }
  return fuzzyCandidates.size === 1 ? fuzzyCandidates.values().next().value : undefined;
}

export async function loadCharacterLibraryAvatarLookup(
  loadCharacters: () => Promise<Array<{ data: string; avatarPath?: string | null }>>,
  onError: (error: unknown) => void,
): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  let characters: Array<{ data: string; avatarPath?: string | null }>;
  try {
    characters = await loadCharacters();
  } catch (error) {
    onError(error);
    return lookup;
  }
  for (const character of characters) {
    try {
      const data = JSON.parse(character.data) as { name?: string };
      if (data.name && character.avatarPath) addNameLookupEntry(lookup, data.name, character.avatarPath);
    } catch {
      /* skip malformed library rows */
    }
  }
  return lookup;
}

export function npcAvatarSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeNpcName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/'/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMariNpcName(name: unknown): boolean {
  if (typeof name !== "string") return false;
  const normalized = normalizeNpcName(name);
  return normalized === "mari" || normalized === "professor mari";
}

export function isInvalidBuiltInMariNpcAvatar(npc: Pick<GameNpc, "name" | "avatarUrl">): boolean {
  const avatarPath = typeof npc.avatarUrl === "string" ? npc.avatarUrl.split("?")[0] : "";
  return avatarPath === BUILT_IN_MARI_AVATAR && !isMariNpcName(npc.name);
}

export function sanitizeGameNpcAvatarUrls(npcs: GameNpc[]): GameNpc[] {
  let changed = false;
  const sanitized = npcs.map((npc) => {
    const { met: _met, ...withoutMet } = npc as GameNpc & { met?: unknown };
    const hasLegacyMet = "met" in npc;
    if (!isInvalidBuiltInMariNpcAvatar(withoutMet)) {
      if (hasLegacyMet) changed = true;
      return withoutMet;
    }
    changed = true;
    const { avatarUrl: _avatarUrl, ...rest } = withoutMet;
    return rest;
  });
  return changed ? sanitized : npcs;
}
