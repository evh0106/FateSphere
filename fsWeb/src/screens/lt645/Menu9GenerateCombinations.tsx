import { useEffect, useState } from "react";
import { deleteGeneratedFiles, generateMyCombinations, getGeneratedFiles, getGeneratedFileContent, generateFate, getFateFileContent } from "../../api/client";
import type { MenuProps } from "./types";

const sourceFilePath = __SOURCE_FILE_PATH__;

function getNumberColor(num: number): string {
  if (num >= 1 && num <= 10) return "#e08f00";
  if (num >= 11 && num <= 20) return "#0063cc";
  if (num >= 21 && num <= 30) return "#d8314f";
  if (num >= 31 && num <= 40) return "#6e7382";
  if (num >= 41 && num <= 45) return "#2c9e44";
  return "inherit";
}

interface GeneratedFileRow {
  file_name: string;
  fate_file: string | null;
}

export default function Menu9GenerateCombinations({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [generateCount, setGenerateCount] = useState("2000");
  const [generatedRows, setGeneratedRows] = useState<number[][]>([]);
  const [savedFile, setSavedFile] = useState<string>("");
  const [fileRows, setFileRows] = useState<GeneratedFileRow[]>([]);
  const [checkedRows, setCheckedRows] = useState<Record<number, boolean>>({});
  
  // Custom Modal States for Fate Number Generation
  const [isFateModalOpen, setIsFateModalOpen] = useState(false);
  const [fateCount, setFateCount] = useState("5");
  const [selectedFileForFate, setSelectedFileForFate] = useState("");

  // Custom Modal States for Viewing Fate Numbers
  const [isFateViewModalOpen, setIsFateViewModalOpen] = useState(false);
  const [viewingFateFile, setViewingFateFile] = useState("");
  const [fateFileRows, setFateFileRows] = useState<number[][]>([]);

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

  function handleFileClick(fileName: string) {
    runTask(async () => {
      const data = await getGeneratedFileContent(fileName);
      setGeneratedRows(data.combinations);
      setSavedFile(fileName);
      setLastResponse(data);
      setMessage(`Loaded ${data.combinations.length} combinations from ${fileName}.`);
    });
  }

  function handleFateFileClick(fileName: string) {
    runTask(async () => {
      const data = await getFateFileContent(fileName);
      setFateFileRows(data.combinations);
      setViewingFateFile(fileName);
      setIsFateViewModalOpen(true);
      setMessage(`Loaded ${data.combinations.length} combinations from fate/${fileName}.`);
    });
  }

  function handleGenerateFate() {
    const checkedIndexes = Object.entries(checkedRows)
      .filter(([_, checked]) => checked)
      .map(([idx]) => Number(idx));

    if (checkedIndexes.length !== 1) {
      window.alert("Please select exactly one file to generate Fate numbers.");
      return;
    }

    const fileRow = fileRows[checkedIndexes[0]];
    setSelectedFileForFate(fileRow.file_name);
    setFateCount("5"); // default value
    setIsFateModalOpen(true);
  }

  function submitGenerateFate() {
    const count = Number(fateCount);
    if (!Number.isInteger(count) || count <= 0) {
      window.alert("Count must be a positive integer.");
      return;
    }

    runTask(async () => {
      const res = await generateFate(selectedFileForFate, count);
      setFateFileRows(res.combinations);
      setViewingFateFile(res.fate_file);
      setSavedFile(res.fate_file);
      setLastResponse(res);
      setMessage(`Generated ${res.combinations.length} Fate numbers. Saved to fate/${res.fate_file}`);
      setIsFateModalOpen(false);
      setFateCount("");
      setSelectedFileForFate("");
      setIsFateViewModalOpen(true);
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
                  <td key={i} style={{ color: getNumberColor(num), fontWeight: "bold" }}>
                    {String(num).padStart(2, "0")}
                  </td>
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
        <button
          type="button"
          className="secondary"
          disabled={!hasCheckedFiles}
          onClick={handleGenerateFate}
          style={{ marginLeft: "0.5rem" }}
        >
          Generate Fate
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "40px", textAlign: "center" }}>check</th>
              <th style={{ width: "60px" }}>no</th>
              <th>file_name</th>
              <th>fate_number</th>
            </tr>
          </thead>
          <tbody>
            {fileRows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "var(--fg-muted)", padding: "1.5rem" }}>
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
                  <td
                    style={{ fontFamily: "monospace", cursor: "pointer", textDecoration: "underline", color: "var(--accent-fg)" }}
                    onClick={() => handleFileClick(row.file_name)}
                  >
                    {row.file_name}
                  </td>
                  <td style={{ fontFamily: "monospace" }}>
                    {row.fate_file ? (
                      <span
                        style={{ cursor: "pointer", textDecoration: "underline", color: "var(--accent-fg)" }}
                        onClick={() => handleFateFileClick(row.fate_file!)}
                      >
                        {row.fate_file}
                      </span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderGeneratedTable()}
      {savedFile && (
        <p style={{ fontSize: "0.85rem", color: "var(--fg-muted)", marginTop: "0.5rem" }}>
          💾 Saved to: <code style={{ color: "var(--fg-default)" }}>
            {savedFile.startsWith("fate_") ? `lt645/db/fate/${savedFile}` : `lt645/db/gn/${savedFile}`}
          </code>
        </p>
      )}

      {isFateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>Generate Fate Numbers</h3>
            <p className="muted" style={{ margin: "-0.5rem 0 0.5rem" }}>
              Source: <code>{selectedFileForFate}</code>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <span>Count</span>
                <input
                  type="text"
                  placeholder="e.g. 5"
                  value={fateCount}
                  onChange={(e) => setFateCount(e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setIsFateModalOpen(false);
                  setFateCount("");
                  setSelectedFileForFate("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitGenerateFate}
                style={{
                  background: "var(--accent-emphasis)",
                  color: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.1)"
                }}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {isFateViewModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFateViewModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: "500px", maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>Fate Numbers</h3>
            <p className="muted" style={{ margin: "-0.5rem 0 0.5rem" }}>
              File: <code>fate/{viewingFateFile}</code>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", overflow: "hidden", marginTop: "1rem" }}>
              <div style={{ overflowY: "auto", maxHeight: "300px", border: "1px solid var(--border-muted)", borderRadius: "6px" }}>
                <table className="data-table" style={{ margin: 0, border: "none" }}>
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
                    {fateFileRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "var(--fg-muted)", padding: "1rem" }}>
                          No numbers found in this fate file.
                        </td>
                      </tr>
                    ) : (
                      fateFileRows.map((combo, index) => (
                        <tr key={`${combo.join("-")}-${index}`}>
                          <td>{index + 1}</td>
                          {combo.map((num, i) => (
                            <td key={i} style={{ color: getNumberColor(num), fontWeight: "bold" }}>
                              {String(num).padStart(2, "0")}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setIsFateViewModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
