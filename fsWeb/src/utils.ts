export function formatNumbers(numbers: number[]): string {
  return numbers.map((num) => String(num).padStart(2, "0")).join(" ");
}

export function parseSixUniqueNumbers(raw: string): number[] {
  const parts = raw
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length !== 6) {
    throw new Error("Exactly 6 numbers are required.");
  }

  const numbers = parts.map((part) => {
    const value = Number(part);
    if (!Number.isInteger(value) || value < 1 || value > 45) {
      throw new Error("Numbers must be integers from 1 to 45.");
    }
    return value;
  });

  const unique = new Set(numbers);
  if (unique.size !== 6) {
    throw new Error("All numbers must be unique.");
  }

  return [...numbers].sort((a, b) => a - b);
}
