import type { ReactNode } from "react";

type EmptyStateProps = { icon: ReactNode; title: string; body: string; action?: ReactNode };

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center animate-fade-up">
      <div className="flex size-14 items-center justify-center rounded-full bg-stone text-ink-2">{icon}</div>
      <h3 className="font-display text-heading">{title}</h3>
      <p className="max-w-xs text-ink-3">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
