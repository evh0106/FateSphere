export type MenuKey = "1" | "2" | "3" | "4" | "5" | "6" | "9" | "0";

export type ResultRow = {
  round: number;
  draw_date?: string;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  n6: number;
  bonus: number;
};

export type ProbabilityRow = {
  rank: string;
  favorable: number;
  total: number;
  probability: number;
  odds: number;
};

export type ExcludedCombination = {
  id: string;
  numbers: number[];
};

export type ApiError = {
  message: string;
  details?: string;
};
