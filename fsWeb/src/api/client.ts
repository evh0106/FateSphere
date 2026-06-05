import type { ExcludedCombination, ResultRow } from "../types";

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

export async function generateMyCombinations(count: number): Promise<{ combinations: number[][] }> {
  return request<{ combinations: number[][] }>("/api/lt645/generate", {
    method: "POST",
    body: JSON.stringify({ count })
  });
}
