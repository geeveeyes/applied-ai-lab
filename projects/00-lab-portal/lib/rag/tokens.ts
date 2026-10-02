const STOP = new Set("a an and are as at be by for from how in is it of on or that the to was what when where which who will with do does can i my".split(" "));

/** Strip plural/verb suffixes repeatedly so "meetings" and "meeting" reach the same stem. */
export function stem(tok: string): string {
  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (tok.endsWith(suffix) && tok.length - suffix.length >= 4) return stem(tok.slice(0, -suffix.length));
  }
  return tok;
}

export function tokens(text: string): string[] {
  const t = text.toLowerCase().replace(/(?<=\d)\((\w)\)/g, "$1"); // 401(k) -> 401k
  return (t.match(/[a-z0-9$]+/g) ?? []).filter((w) => !STOP.has(w)).map(stem);
}
