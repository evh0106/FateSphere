import { useState } from "react";
import type { MenuProps } from "../lt645/types";

const sourceFilePath = __SOURCE_FILE_PATH__;

export default function Menu9GenerateCombinations({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [generateCount, setGenerateCount] = useState("5");

  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Generate My Number Combinations (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 9 (pt720 skeleton).</p>
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
            setLastResponse({ combinations: [] });
            setMessage(`[Skeleton] Generated ${count} combinations for pt720.`);
          })
        }
      >
        Generate
      </button>
    </section>
  );
}
