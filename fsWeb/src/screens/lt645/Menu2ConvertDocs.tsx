import { convertDocsResult } from "../../api/client";
import type { MenuProps } from "./types";

export default function Menu2ConvertDocs({ runTask, setLastResponse, setMessage }: MenuProps) {
  return (
    <section className="panel">
      <h2>Convert docs/result.md to db/result.csv</h2>
      <p className="muted">Equivalent to CLI menu 2.</p>
      <button
        type="button"
        onClick={() =>
          runTask(async () => {
            const data = await convertDocsResult();
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
