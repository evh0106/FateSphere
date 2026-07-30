import type { ExcludedCombination, ResultRow, ExcludeRule } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const PT720_API_BASE_URL = import.meta.env.VITE_PT720_API_BASE_URL ?? "http://localhost:8001";

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
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
  return request<{ converted: number }>(API_BASE_URL, "/api/lt645/convert", { method: "POST" });
}

export async function convertDocsResultPt720(): Promise<{ converted: number }> {
  return request<{ converted: number }>(PT720_API_BASE_URL, "/api/pt720/convert", { method: "POST" });
}

export async function crawlNewResults(): Promise<{ crawled: number }> {
  return request<{ crawled: number }>(API_BASE_URL, "/api/lt645/crawl", { method: "POST" });
}

export async function crawlNewResultsPt720(): Promise<{ crawled: number }> {
  return request<{ crawled: number }>(PT720_API_BASE_URL, "/api/pt720/crawl", { method: "POST" });
}

export async function crawlRange(startRound: number, endRound: number): Promise<{ crawled: number }> {
  return request<{ crawled: number }>(API_BASE_URL, "/api/lt645/crawl-range", {
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
  return request<{ rows: ResultRow[] }>(API_BASE_URL, `/api/lt645/results${suffix}`);
}

export async function getExcludedCombinations(): Promise<{ rows: ExcludedCombination[] }> {
  return request<{ rows: ExcludedCombination[] }>(API_BASE_URL, "/api/lt645/excluded");
}

export async function addExcludedCombination(numbers: number[]): Promise<ExcludedCombination> {
  return request<ExcludedCombination>(API_BASE_URL, "/api/lt645/excluded", {
    method: "POST",
    body: JSON.stringify({ numbers })
  });
}

export async function deleteExcludedCombination(id: string): Promise<void> {
  return request<void>(API_BASE_URL, `/api/lt645/excluded/${id}`, { method: "DELETE" });
}

export async function addExcludeRule(ruleName: string, functionName: string): Promise<{ message: string; rule_name: string; function_name: string }> {
  return request<{ message: string; rule_name: string; function_name: string }>(API_BASE_URL, "/api/lt645/exclude-rules", {
    method: "POST",
    body: JSON.stringify({ rule_name: ruleName, function_name: functionName })
  });
}

export async function getExcludeRules(): Promise<{ rows: ExcludeRule[] }> {
  return request<{ rows: ExcludeRule[] }>(API_BASE_URL, "/api/lt645/exclude-rules");
}

export async function saveExcludeRules(rules: ExcludeRule[]): Promise<{ message: string; count: number }> {
  return request<{ message: string; count: number }>(API_BASE_URL, "/api/lt645/exclude-rules", {
    method: "PUT",
    body: JSON.stringify({ rules })
  });
}

export async function generateExcludedRules(rules: ExcludeRule[]): Promise<{ message: string; count: number }> {
  return request<{ message: string; count: number }>(API_BASE_URL, "/api/lt645/exclude-rules/generate", {
    method: "POST",
    body: JSON.stringify({ rules })
  });
}

export async function runExcludeRuleLt645(functionName: string): Promise<{
  function_name: string;
  excluded_count: number;
  rows: Array<{ round: number; numbers: number[]; bonus: number; draw_date: string }>;
}> {
  return request(API_BASE_URL, "/api/lt645/exclude-rules/run", {
    method: "POST",
    body: JSON.stringify({ function_name: functionName })
  });
}

export async function generateMyCombinations(count: number): Promise<{ combinations: number[][]; saved_file: string }> {
  return request<{ combinations: number[][]; saved_file: string }>(API_BASE_URL, "/api/lt645/generate", {
    method: "POST",
    body: JSON.stringify({ count })
  });
}

export async function getGeneratedFiles(): Promise<{ rows: Array<{ file_name: string; fate_file: string | null }> }> {
  return request<{ rows: Array<{ file_name: string; fate_file: string | null }> }>(API_BASE_URL, "/api/lt645/generated-files");
}

export async function getGeneratedFileContent(fileName: string): Promise<{ combinations: number[][] }> {
  return request<{ combinations: number[][] }>(API_BASE_URL, `/api/lt645/generated-files/${encodeURIComponent(fileName)}`);
}

export async function generateFate(fileName: string, count: number): Promise<{ fate_file: string; combinations: number[][] }> {
  return request<{ fate_file: string; combinations: number[][] }>(API_BASE_URL, "/api/lt645/generate-fate", {
    method: "POST",
    body: JSON.stringify({ file_name: fileName, count })
  });
}

export async function getFateFileContent(fileName: string): Promise<{ combinations: number[][] }> {
  return request<{ combinations: number[][] }>(API_BASE_URL, `/api/lt645/fate-files/${encodeURIComponent(fileName)}`);
}

export async function deleteGeneratedFiles(fileNames: string[]): Promise<{ deleted: string[]; errors: string[] }> {
  return request<{ deleted: string[]; errors: string[] }>(API_BASE_URL, "/api/lt645/generated-files", {
    method: "DELETE",
    body: JSON.stringify({ file_names: fileNames })
  });
}
