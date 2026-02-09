export type Category = {
  id: string;
  name: string;
  colorHex: string;
};

export function createCategory(name: string, colorHex: string): Category {
  return {
    id: crypto.randomUUID(),
    name,
    colorHex
  };
}
