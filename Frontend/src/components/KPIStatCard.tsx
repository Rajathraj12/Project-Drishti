interface KPIStatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  info?: boolean;
  highlight?: boolean;
}

export function KPIStatCard({ label, value, icon, info, highlight }: KPIStatCardProps) {
  return (
    <div className="gov-stat-card">
      <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 4, lineHeight: 1.4 }}>
          {label}
          {info && <span style={{ marginLeft: 4, fontSize: "0.6rem", color: "#a0aec0" }}>ⓘ</span>}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", color: highlight ? "var(--color-risk-high)" : "var(--color-navy-700)" }}>
          {value}
        </div>
      </div>
    </div>
  );
}
