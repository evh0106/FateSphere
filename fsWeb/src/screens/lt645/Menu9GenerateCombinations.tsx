import { useEffect, useState } from "react";
import { deleteGeneratedFiles, generateMyCombinations, getGeneratedFiles } from "../../api/client";
import type { MenuProps } from "./types";

const sourceFilePath = __SOURCE_FILE_PATH__;

interface GeneratedFileRow {
  file_name: string;
}

export default function Menu9GenerateCombinations({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [generateCount, setGenerateCount] = useState("2000");
  const [generatedRows, setGeneratedRows] = useState<number[][]>([]);
  const [savedFile, setSavedFile] = useState<string>("");
  const [fileRows, setFileRows] = useState<GeneratedFileRow[]>([]);
  const [checkedRows, setCheckedRows] = useState<Record<number, boolean>>({});

  const hasCheckedFiles = Object.values(checkedRows).some(Boolean);

  async function loadGeneratedFiles() {
    const data = await getGeneratedFiles();
    setFileRows(data.rows);
    setCheckedRows({});
    setLastResponse(data);
  }

  useEffect(() => {
    runTask(async () => {
      await loadGeneratedFiles();
      setMessage("Loaded generated file list.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCheckRow(index: number) {
    setCheckedRows((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  }

  function handleDeleteFiles() {
    const selectedFiles = fileRows
      .filter((_, index) => checkedRows[index])
      .map((row) => row.file_name);

    if (selectedFiles.length === 0) {
      return;
    }

    runTask(async () => {
      const result = await deleteGeneratedFiles(selectedFiles);
      setLastResponse(result);

      if (result.deleted.length > 0) {
        setMessage(`Deleted ${result.deleted.length} file(s).`);
      } else if (result.errors.length > 0) {
        setMessage(result.errors.join("; "));
      }

      await loadGeneratedFiles();
    });
  }

  function renderGeneratedTable() {
    if (generatedRows.length === 0) {
      return <p className="muted">No combinations generated yet.</p>;
    }

    return (
      <div style={{ overflowX: "auto", marginTop: "1rem" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>No1</th>
              <th>No2</th>
              <th>No3</th>
              <th>No4</th>
              <th>No5</th>
              <th>No6</th>
            </tr>
          </thead>
          <tbody>
            {generatedRows.map((combo, index) => (
              <tr key={`${combo.join("-")}-${index}`}>
                <td>{index + 1}</td>
                {combo.map((num, i) => (
                  <td key={i}>{String(num).padStart(2, "0")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="panel">
      <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", fontFamily: "monospace", marginBottom: "0.5rem" }}>
        {sourceFilePath}
      </div>
      <h2>Generate My Number Combinations</h2>
      <p className="muted">Equivalent to CLI menu 9.</p>

      <div className="form-row" style={{ display: "flex" }}>
          <label style={{ display: "flex", alignItems: "center" }}>
            Count: <input value={generateCount} onChange={(event) => setGenerateCount(event.target.value)} />
          </label>

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
                await loadGeneratedFiles();
              })
            }
          >
            Generate
          </button>
      </div>

      <div className="row-actions">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            runTask(async () => {
              await loadGeneratedFiles();
              setMessage("Generated file list refreshed.");
            })
          }
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={!hasCheckedFiles}
          onClick={handleDeleteFiles}
          style={{
            background: hasCheckedFiles ? "var(--danger-emphasis)" : undefined,
            color: hasCheckedFiles ? "#ffffff" : undefined,
            border: hasCheckedFiles ? "1px solid rgba(0,0,0,0.1)" : undefined
          }}
        >
          Delete
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "40px", textAlign: "center" }}>check</th>
              <th style={{ width: "60px" }}>no</th>
              <th>file_name</th>
            </tr>
          </thead>
          <tbody>
            {fileRows.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", color: "var(--fg-muted)", padding: "1.5rem" }}>
                  No generated files in lt645/db/gn.
                </td>
              </tr>
            ) : (
              fileRows.map((row, index) => (
                <tr key={row.file_name}>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!checkedRows[index]}
                      onChange={() => handleCheckRow(index)}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                  </td>
                  <td>{index + 1}</td>
                  <td style={{ fontFamily: "monospace" }}>{row.file_name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderGeneratedTable()}
      {savedFile && (
        <p style={{ fontSize: "0.85rem", color: "var(--fg-muted)", marginTop: "0.5rem" }}>
          💾 Saved to: <code style={{ color: "var(--fg-default)" }}>lt645/db/gn/{savedFile}</code>
        </p>
      )}
    </section>
  );
}
