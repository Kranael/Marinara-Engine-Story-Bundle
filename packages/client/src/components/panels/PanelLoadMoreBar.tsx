import type { ReactNode } from "react";

interface PanelLoadMoreBarProps {
  children: ReactNode;
  disabled?: boolean;
  /** Optional data-testid for the load-more button (defaults to "panel-load-more-button") */
  testId?: string;
  onLoadMore: () => void;
}

export function PanelLoadMoreBar({ children, disabled = false, testId, onLoadMore }: PanelLoadMoreBarProps) {
  return (
    <div className="sticky bottom-0 z-20 -mx-3 mt-2 border-t border-[var(--marinara-chat-chrome-panel-divider)] bg-[var(--sidebar)]/95 px-3 pb-3 pt-2 backdrop-blur-md">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={disabled}
        data-testid={testId ?? "panel-load-more-button"}
        className="mari-chrome-control mari-chrome-control--primary w-full justify-center text-xs"
      >
        {children}
      </button>
    </div>
  );
}
