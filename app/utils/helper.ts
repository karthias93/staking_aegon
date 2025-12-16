export function toFixedTrunc(value: number, decimals: number): string {

  const factor = Math.pow(10, decimals);
  const truncated = Math.trunc(value * factor) / factor;

  return truncated.toString();
}
