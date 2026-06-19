import type { ExcludedCombination, ResultRow, ExcludeRule } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    let details = "";
    try {
      details = await response.text();
    } catch {
      details = "";
    }
    throw new Error(details || fallback);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function convertDocsResult(): Promise<{ converted: number }> {
  return request<{ converted: number }>("/api/lt645/convert", { method: "POST" });
}

export async function crawlNewResults(): Promise<{ crawled: number }> {
  return request<{ crawled: number }>("/api/lt645/crawl", { method: "POST" });
}

export async function crawlRange(startRound: number, endRound: number): Promise<{ crawled: number }> {
  return request<{ crawled: number }>("/api/lt645/crawl-range", {
    method: "POST",
    body: JSON.stringify({ startRound, endRound })
  });
}

export async function getResults(params?: {
  startRound?: number;
  endRound?: number;
  limit?: number;
}): Promise<{ rows: ResultRow[] }> {
  const query = new URLSearchParams();

  if (params?.startRound !== undefined) {
    query.set("startRound", String(params.startRound));
  }
  if (params?.endRound !== undefined) {
    query.set("endRound", String(params.endRound));
  }
  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<{ rows: ResultRow[] }>(`/api/lt645/results${suffix}`);
}

export async function getExcludedCombinations(): Promise<{ rows: ExcludedCombination[] }> {
  return request<{ rows: ExcludedCombination[] }>("/api/lt645/excluded");
}

export async function addExcludedCombination(numbers: number[]): Promise<ExcludedCombination> {
  return request<ExcludedCombination>("/api/lt645/excluded", {
    method: "POST",
    body: JSON.stringify({ numbers })
  });
}

export async function deleteExcludedCombination(id: string): Promise<void> {
  return request<void>(`/api/lt645/excluded/${id}`, { method: "DELETE" });
}

export async function addExcludeRule(ruleName: string, functionName: string): Promise<{ message: string; rule_name: string; function_name: string }> {
  return request<{ message: string; rule_name: string; function_name: string }>("/api/lt645/exclude-rules", {
    method: "POST",
    body: JSON.stringify({ rule_name: ruleName, function_name: functionName })
  });
}

export async function getExcludeRules(): Promise<{ rows: ExcludeRule[] }> {
  return request<{ rows: ExcludeRule[] }>("/api/lt645/exclude-rules");
}

export async function saveExcludeRules(rules: ExcludeRule[]): Promise<{ message: string; count: number }> {
  return request<{ message: string; count: number }>("/api/lt645/exclude-rules", {
    method: "PUT",
    body: JSON.stringify({ rules })
  });
}

export async function generateExcludedRules(rules: ExcludeRule[]): Promise<{ message: string; count: number }> {
  return request<{ message: string; count: number }>("/api/lt645/exclude-rules/generate", {
    method: "POST",
    body: JSON.stringify({ rules })
  });
}

export async function runExcludeRuleLt645(functionName: string): Promise<{
  function_name: string;
  excluded_count: number;
  rows: Array<{ round: number; numbers: number[]; bonus: number; draw_date: string }>;
}> {
  return request("/api/lt645/exclude-rules/run", {
    method: "POST",
    body: JSON.stringify({ function_name: functionName })
  });
}

export async function generateMyCombinations(count: number): Promise<{ combinations: number[][]; saved_file: string }> {
  return request<{ combinations: number[][]; saved_file: string }>("/api/lt645/generate", {
    method: "POST",
    body: JSON.stringify({ count })
  });
}
