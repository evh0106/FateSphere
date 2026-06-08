import { useEffect, useState } from "react";
import { addExcludedCombination, deleteExcludedCombination, getExcludedCombinations } from "../api/client";
import { formatNumbers, parseSixUniqueNumbers } from "../utils";
import type { ExcludedCombination } from "../types";
import type { MenuProps } from "./types";

export default function Menu6ManageExcluded({ runTask, setLastResponse, setMessage }: MenuProps) {
  const [excludedInput, setExcludedInput] = useState("1 2 3 4 5 6");
  const [excludedRows, setExcludedRows] = useState<ExcludedCombination[]>([]);

  async function loadExcluded() {
    const data = await getExcludedCombinations();
    setExcludedRows(data.rows);
    setLastResponse(data);
  }

  useEffect(() => {
    runTask(async () => {
      await loadExcluded();
      setMessage("Loaded excluded combinations.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderExcludedList() {
    return (
      <div className="excluded-list">
        {excludedRows.length === 0 ? <p className="muted">No excluded combinations.</p> : null}
        {excludedRows.map((item) => (
          <div key={item.id} className="excluded-item">
            <span>{formatNumbers(item.numbers)}</span>
            <button
              type="button"
              className="danger"
              onClick={() =>
                runTask(async () => {
                  await deleteExcludedCombination(item.id);
                  await loadExcluded();
                  setMessage("Excluded combination removed.");
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="panel">
      <h2>Manage Excluded Number Combinations</h2>
      <p className="muted">Equivalent to CLI menu 6.</p>
      <div className="form-row">
        <label className="wide">
          Numbers (6 unique values from 1 to 45)
          <input
            value={excludedInput}
            onChange={(event) => setExcludedInput(event.target.value)}
            placeholder="e.g. 1 2 3 4 5 6"
          />
        </label>
      </div>
      <div className="row-actions">
        <button
          type="button"
          onClick={() =>
            runTask(async () => {
              const numbers = parseSixUniqueNumbers(excludedInput);
              const data = await addExcludedCombination(numbers);
              setLastResponse(data);
              await loadExcluded();
              setMessage("Excluded combination added.");
            })
          }
        >
          Add Combination
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            runTask(async () => {
              await loadExcluded();
              setMessage("Excluded combinations refreshed.");
            })
          }
        >
          Refresh
        </button>
      </div>
      {renderExcludedList()}
    </section>
  );
}
