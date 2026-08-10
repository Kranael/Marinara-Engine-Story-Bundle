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
  createdAt: string;
  updatedAt: string;
}
