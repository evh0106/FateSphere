import { convertDocsResultPt720 } from "../../api/client";
import type { MenuProps } from "./types";

const sourceFilePath = __SOURCE_FILE_PATH__;

export default function Menu2ConvertDocs({ runTask, setLastResponse, setMessage }: MenuProps) {
  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Convert docs/result.md to db/result.csv (pt720)</h2>
      <p className="muted">Equivalent to CLI menu 2 (pt720 skeleton).</p>
      <button
        type="button"
        onClick={() =>
          runTask(async () => {
            const data = await convertDocsResultPt720();
            setLastResponse(data);
            setMessage(`Converted ${data.converted} rows.`);
          })
        }
      >
        Run Convert
      </button>
    </section>
  );
}
