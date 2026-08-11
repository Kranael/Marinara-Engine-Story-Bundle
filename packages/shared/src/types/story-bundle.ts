// ──────────────────────────────────────────────
// Story Bundle Types
// ──────────────────────────────────────────────

/**
 * A Story Bundle is a lightweight named container for future story content.
 * The first iteration intentionally carries only a title so the object,
 * storage, API and UI plumbing exist before content fields are added.
 */
export interface StoryBundle {
  id: string;
  /** The bundle's title. */
  name: string;
  /** Optional HTML description. Rendered safely via DOMPurify on the client. */
  description: string | null;
  /** IDs of characters assigned to this story bundle. */
  characterIds: string[];
  /** IDs of personas assigned to this story bundle. */
  personaIds: string[];
  /** IDs of lorebooks assigned to this story bundle. */
  lorebookIds: string[];
  /** IDs of presets assigned to this story bundle. */
  presetIds: string[];
  createdAt: string;
  updatedAt: string;
}
