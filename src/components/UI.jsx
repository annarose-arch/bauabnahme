import { COLORS } from "../lib/constants.js";

/** Section panel with BauAbnahme card styling */
export function Panel({ children, style = {} }) {
  return (
    <section
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 18,
        ...style
      }}
    >
      {children}
    </section>
  );
}

export function StatusBadge({ status, renderStatus }) {
  return renderStatus(status);
}
