import { useParams } from 'react-router-dom';

export default function WhyFlagged() {
  const { id } = useParams();
  
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-navy-700)", marginBottom: 16 }}>Risk Justification: {id}</h1>
      <div className="gov-card" style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚠️</div>
        <h3>Why Flagged (ML Isolation Forest)</h3>
        <p>This page will explain exactly why this project was flagged by the rule engine and ML models.</p>
        <p style={{ fontSize: "0.8rem", marginTop: 12, opacity: 0.7 }}>(Pending Django REST API integration)</p>
      </div>
    </div>
  );
}
