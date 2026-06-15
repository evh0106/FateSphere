const sourceFilePath = __SOURCE_FILE_PATH__;

export default function Menu0Exit() {
  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Exit</h2>
      <p>This mirrors CLI menu 0. Close the browser tab to end the session.</p>
    </section>
  );
}
