// Oráculo helpers — espelham os asserts de tbh-copilot/engine/test.cjs.
//   approx(got, want, tolPct) -> approxPct   eq(got, want) -> eq   ok(cond) -> ok
import { expect } from "vitest";

export const approxPct = (got: number, want: number, tolPct: number, label: string): void =>
  expect(Math.abs(got - want), label).toBeLessThanOrEqual((Math.abs(want) * tolPct) / 100);

export const eq = <T>(got: T, want: T, label: string): void => expect(got, label).toStrictEqual(want);

export const ok = (cond: boolean, label: string): void => expect(cond, label).toBe(true);
