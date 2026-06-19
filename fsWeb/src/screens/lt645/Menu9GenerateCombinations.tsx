import { useState } from "react";
import { generateMyCombinations } from "../../api/client";
import { formatNumbers } from "../../utils";
import type { MenuProps } from "./types";

const sourceFilePath = __SOURCE_FILE_PATH__;

export default function Menu9GenerateCombinations({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [generateCount, setGenerateCount] = useState("2000");
  const [generatedRows, setGeneratedRows] = useState<number[][]>([]);
  const [savedFile, setSavedFile] = useState<string>("");

  function renderGeneratedList() {
    if (generatedRows.length === 0) {
      return <p className="muted">No combinations generated yet.</p>;
    }

    return (
      <ol className="generated-list">
        {generatedRows.map((combo, index) => (
          <li key={`${combo.join("-")}-${index}`}>{formatNumbers(combo)}</li>
        ))}
      </ol>
    );
  }

  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Generate My Number Combinations</h2>
      <p className="muted">Equivalent to CLI menu 9.</p>
      <div className="form-row">
        <label>
          Count
          <input value={generateCount} onChange={(event) => setGenerateCount(event.target.value)} />
        </label>
      </div>
      <button
        type="button"
        onClick={() =>
          runTask(async () => {
            const count = Number(generateCount);
            if (!Number.isInteger(count) || count <= 0) {
              throw new Error("Count must be a positive integer.");
            }
            const data = await generateMyCombinations(count);
            setGeneratedRows(data.combinations);
            setSavedFile(data.saved_file);
            setLastResponse(data);
            setMessage(`Generated ${data.combinations.length} combinations. Saved to ${data.saved_file}`);
          })
        }
      >
        Generate
      </button>
      {renderGeneratedList()}
      {savedFile && (
        <p style={{ fontSize: "0.85rem", color: "var(--fg-muted)", marginTop: "0.5rem" }}>
          💾 Saved to: <code style={{ color: "var(--fg-default)" }}>lt645/db/{savedFile}</code>
        </p>
      )}
    </section>
  );
}
