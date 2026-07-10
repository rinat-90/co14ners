export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "white",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "2rem",
        gap: "1rem",
      }}
    >
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.478 0 8.268 2.943 9.543 7-.625 1.924-1.766 3.609-3.228 4.913M6.228 6.228A10.45 10.45 0 003.082 11.83a10.45 10.45 0 0010.45 3.228" />
      </svg>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>You&apos;re offline</h1>
      <p style={{ color: "#94a3b8", maxWidth: 320, margin: 0, lineHeight: 1.6 }}>
        No internet connection. Previously visited peaks and your summit log are still available — connect to load new content.
      </p>
      <a
        href="/"
        style={{
          marginTop: "0.5rem",
          padding: "0.625rem 1.5rem",
          background: "#1d4ed8",
          color: "white",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
        }}
      >
        Go to home
      </a>
    </div>
  );
}
