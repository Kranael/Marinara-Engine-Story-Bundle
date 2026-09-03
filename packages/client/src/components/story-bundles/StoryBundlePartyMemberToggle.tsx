// ──────────────────────────────────────────────
// Party Member / NPC toggle pill
// ──────────────────────────────────────────────
// Isolated presentational piece so StoryBundleCharacters only needs to wire
// two props instead of inlining this markup per selected-character row.
import { Swords, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

export interface StoryBundlePartyMemberToggleProps {
  isPartyMember: boolean;
  onToggle: () => void;
}

export function StoryBundlePartyMemberToggle({ isPartyMember, onToggle }: StoryBundlePartyMemberToggleProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      data-testid="story-bundle-party-member-toggle"
      onClick={onToggle}
      aria-pressed={isPartyMember}
      title={
        isPartyMember
          ? t("storyBundles.partyMemberHint", "Party member — joins the player at game start")
          : t("storyBundles.npcHint", "NPC — appears in the world, but does not join the party")
      }
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium transition-all",
        isPartyMember
          ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
      )}
    >
      {isPartyMember ? <Swords size="0.7rem" /> : <UserRound size="0.7rem" />}
      {isPartyMember ? t("storyBundles.partyMember", "Party") : t("storyBundles.npc", "NPC")}
    </button>
  );
}
