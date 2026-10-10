export function RiskBadge({ status }: { status: string }) {
  const cls = status === "High Risk" ? "badge-high" : status === "Medium Risk" ? "badge-medium" : "badge-low"
  return <span className={cls}>{status}</span>
}
