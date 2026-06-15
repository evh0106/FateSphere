import { useState } from "react";
import type { MenuProps } from "../lt645/types";

export default function Menu5ShowResults({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [showStartRound, setShowStartRound] = useState("");
  const [showEndRound, setShowEndRound] = useState("");

  return (
    <section className="panel">
      <h2>Show db/result.csv (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 5 (pt720 skeleton).</p>
      <div className="form-row">
        <label>
          Start round (optional)
          <input value={showStartRound} onChange={(event) => setShowStartRound(event.target.value)} />
        </label>
        <label>
          End round (optional)
          <input value={showEndRound} onChange={(event) => setShowEndRound(event.target.value)} />
        </label>
      </div>
      <button
        type="button"
        onClick={() =>
          runTask(async () => {
            setLastResponse({ rows: [] });
            setMessage(`[Skeleton] Showed results for pt720.`);
          })
        }
      >
        Load Results
      </button>
    </section>
  );
}
