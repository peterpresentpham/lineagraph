// Plain React — no next/* or react-router/* imports here, since this component is shared
// by both apps/web (Next.js) and apps/admin (Vite). See section 1 of thiet-ke-ui-va-kien-truc-service.md.

export type CertaintyBadgeProps = {
  certainty: number;
  disputed?: boolean;
};

export function CertaintyBadge({ certainty, disputed }: CertaintyBadgeProps) {
  const level = certainty >= 0.8 ? "high" : certainty >= 0.5 ? "medium" : "low";
  return (
    <span className={`sp-certainty-badge sp-certainty-${level}`}>
      {Math.round(certainty * 100)}%{disputed ? " · còn tranh cãi" : ""}
    </span>
  );
}
