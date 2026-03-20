import { disassemble, getChoseong } from "es-hangul";

export function hangulIncludes(target: string, search: string): boolean {
  if (!search) return true;
  if (!target) return false;

  const lowerTarget = target.toLowerCase();
  const lowerSearch = search.toLowerCase();

  if (lowerTarget.includes(lowerSearch)) return true;

  const decomposedTarget = disassemble(target);
  const decomposedSearch = disassemble(search);
  if (decomposedTarget && decomposedSearch && decomposedTarget.includes(decomposedSearch)) return true;

  const targetChoseong = getChoseong(target);
  if (targetChoseong && targetChoseong.includes(search)) return true;

  return false;
}
