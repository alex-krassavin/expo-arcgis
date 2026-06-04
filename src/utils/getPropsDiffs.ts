function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

/** Returns the keys whose value changed between `prev` and `next` (added or deep-unequal). */
export function getPropsDiffs<P extends object>(prev: P | undefined, next: P): Array<keyof P> {
  const result: Array<keyof P> = [];
  for (const key in next) {
    if (!prev || !(key in prev) || !deepEqual(prev[key], next[key])) {
      result.push(key);
    }
  }
  return result;
}
