// ──────────────────────────────────────────────
// Story Bundle Builder — "Generate from Lore" game config extraction
// ──────────────────────────────────────────────
// Aggregates a text sample from the bundle's assigned characters and
// lorebook entries, asks the configured connection for genre/setting/tone,
// and parses the (best-effort JSON) response. No chat/session is involved —
// this is a single one-off completion via POST /story-bundles/generate-game-config.
import { api } from "./api-client";

const MAX_CHARACTER_EXCERPT = 400;
const MAX_ENTRY_EXCERPT = 500;
const MAX_CHARACTERS_SAMPLED = 8;
const MAX_ENTRIES_SAMPLED = 12;

export interface GameConfigSourceCharacter {
  id: string;
  data: unknown;
}

export interface GameConfigSourceLorebookEntry {
  name: string;
  content: string;
}

export interface GeneratedGameConfig {
  genre: string;
  setting: string;
  tone: string;
}

/** Character `data` is a JSON-string card payload on the wire; parse defensively. */
function parseCharacterCardData(raw: unknown): { name?: string; description?: string; personality?: string } {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (raw as Record<string, unknown>) ?? {};
}

function truncate(text: string, maxLength: number): string {
  const trimmed = text.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}\u2026` : trimmed;
}

/** Build the aggregated lore sample + instruction prompt sent to the AI. */
export function buildGameConfigGenerationPrompt(
  characters: GameConfigSourceCharacter[],
  entries: GameConfigSourceLorebookEntry[],
): string {
  const characterBlocks = characters.slice(0, MAX_CHARACTERS_SAMPLED).map((character) => {
    const card = parseCharacterCardData(character.data);
    const name = typeof card.name === "string" && card.name.trim() ? card.name.trim() : "Unnamed character";
    const description = [card.description, card.personality]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");
    return `- ${name}: ${truncate(description, MAX_CHARACTER_EXCERPT)}`;
  });

  const entryBlocks = entries
    .slice(0, MAX_ENTRIES_SAMPLED)
    .map((entry) => `- ${entry.name || "Untitled entry"}: ${truncate(entry.content, MAX_ENTRY_EXCERPT)}`);

  const sample = [
    characterBlocks.length > 0 ? `Characters:\n${characterBlocks.join("\n")}` : null,
    entryBlocks.length > 0 ? `Lorebook entries:\n${entryBlocks.join("\n")}` : null,
  ]
    .filter((block): block is string => block !== null)
    .join("\n\n");

  return [
    "You are helping a creator configure a game based on the following characters and lorebook entries.",
    "Read the material below and infer the most fitting game genre, setting, and tone.",
    sample || "(No characters or lorebooks are attached yet \u2014 infer a sensible generic fantasy default.)",
    "",
    "Respond with ONLY a JSON object in this exact shape, no extra text or markdown:",
    '{"genre": "...", "setting": "...", "tone": "..."}',
    '- genre: 2-4 words (e.g. "Dark Fantasy", "Sci-Fi Horror")',
    "- setting: one sentence describing the world/location",
    '- tone: 2-4 words (e.g. "Heroic and hopeful", "Grim and gritty")',
  ].join("\n");
}

/** Best-effort JSON extraction \u2014 models sometimes wrap the object in prose or code fences. */
export function parseGameConfigGenerationResponse(raw: string): GeneratedGameConfig | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const genre = typeof parsed.genre === "string" ? parsed.genre.trim() : "";
    const setting = typeof parsed.setting === "string" ? parsed.setting.trim() : "";
    const tone = typeof parsed.tone === "string" ? parsed.tone.trim() : "";
    if (!genre || !setting || !tone) return null;
    return { genre, setting, tone };
  } catch {
    return null;
  }
}

/** Call the one-off generation endpoint and return the parsed genre/setting/tone. */
export async function generateGameConfigFromLore(args: {
  characters: GameConfigSourceCharacter[];
  entries: GameConfigSourceLorebookEntry[];
  connectionId: string;
}): Promise<GeneratedGameConfig> {
  const prompt = buildGameConfigGenerationPrompt(args.characters, args.entries);
  const { text } = await api.post<{ text: string }>("/story-bundles/generate-game-config", {
    connectionId: args.connectionId,
    prompt,
  });
  const parsed = parseGameConfigGenerationResponse(text);
  if (!parsed) throw new Error("The AI response could not be parsed into genre/setting/tone.");
  return parsed;
}
