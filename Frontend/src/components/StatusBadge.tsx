export function StatusBadge({ status }: { status: string }) {
  const cls = 
    status === "Pending" ? "status-pending" :
    status === "Assigned" ? "status-assigned" :
    status === "In Progress" ? "status-inprogress" :
    status === "Completed" ? "status-completed" :
    status === "Review" ? "status-review" : "badge-blue"
    
  return <span className={`status-badge ${cls}`}>{status}</span>
}
