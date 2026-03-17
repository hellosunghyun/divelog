export function nanoid(size = 21): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(size);

  crypto.getRandomValues(array);

  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}
