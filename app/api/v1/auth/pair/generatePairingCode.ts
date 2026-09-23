import { randomInt } from "crypto";

export function generatePairingCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let p1 = "";
  let p2 = "";
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(randomInt(0, chars.length));
    p2 += chars.charAt(randomInt(0, chars.length));
  }
  return `${p1}-${p2}`;
}
