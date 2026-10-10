export default function Reports() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-navy-700)", marginBottom: 16 }}>Official Reports</h1>
      <div className="gov-card" style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>📈</div>
        <h3>Reporting & Exporting</h3>
        <p>Generate PDF and Excel reports for government briefings.</p>
        <p style={{ fontSize: "0.8rem", marginTop: 12, opacity: 0.7 }}>(Pending Django REST API integration)</p>
      </div>
    </div>
  );
}
