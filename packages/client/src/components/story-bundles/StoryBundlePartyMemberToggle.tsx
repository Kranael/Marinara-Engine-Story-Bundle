// ──────────────────────────────────────────────
// Party Member / NPC toggle pill
// ──────────────────────────────────────────────
// Isolated presentational piece so StoryBundleCharacters only needs to wire
// two props instead of inlining this markup per selected-character row.
import { Users, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type CSSProperties } from "react";
import { cn } from "../../lib/utils";
import { HOME_CHAT_MODE_ACCENTS } from "../../lib/home-chat-mode-style";

export interface StoryBundlePartyMemberToggleProps {
  isPartyMember: boolean;
  onToggle: () => void;
  testId?: string;
}

export function StoryBundlePartyMemberToggle({ isPartyMember, onToggle, testId }: StoryBundlePartyMemberToggleProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      data-testid={testId ?? "story-bundle-party-member-toggle"}
      onClick={onToggle}
      aria-pressed={isPartyMember}
      title={
        isPartyMember
          ? t("storyBundles.partyMemberHint", "Party member — joins the player at game start")
          : t("storyBundles.npcHint", "NPC — appears in the world, but does not join the party")
      }
      style={isPartyMember ? ({ "--home-chat-mode-accent": HOME_CHAT_MODE_ACCENTS.game } as CSSProperties) : undefined}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium transition-all",
        isPartyMember
          ? "border-[var(--home-chat-mode-accent)]/40 bg-[var(--home-chat-mode-accent)]/15 text-[var(--home-chat-mode-accent)]"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
      )}
    >
      {isPartyMember ? <Users size="0.7rem" /> : <UserRound size="0.7rem" />}
      {isPartyMember ? t("storyBundles.partyMember", "Party") : t("storyBundles.npc", "NPC")}
    </button>
  );
}
