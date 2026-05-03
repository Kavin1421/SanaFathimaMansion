import { describe, expect, it } from "vitest";
import {
  computeBalances,
  expenseToNetDeltas,
  simplifyDebts,
  settlementToNetDeltas,
} from "./ledger";

describe("expenseToNetDeltas", () => {
  it("splits equally when one pays for four", () => {
    const d = expenseToNetDeltas({
      amount: 1000,
      paidBy: "kevin",
      splitBetween: ["kevin", "a", "b", "c"],
    });
    expect(d.kevin).toBe(750);
    expect(d.a).toBe(-250);
    expect(d.b).toBe(-250);
    expect(d.c).toBe(-250);
  });
});

describe("computeBalances", () => {
  it("combines expenses and settlements", () => {
    const expenses = [
      { amount: 1000, paidBy: "k", splitBetween: ["k", "d"] },
      { amount: 200, paidBy: "d", splitBetween: ["k", "d"] },
    ];
    const settlements = [{ fromUser: "d", toUser: "k", amount: 400 }];
    const b = computeBalances(expenses, settlements);
    // k: +500-100=400; d: -500+100=-400; settlement 400 → both net 0
    expect(b.k).toBeCloseTo(0, 5);
    expect(b.d).toBeCloseTo(0, 5);
  });
});

describe("settlementToNetDeltas", () => {
  it("moves balance from creditor to debtor", () => {
    const d = settlementToNetDeltas({ fromUser: "d", toUser: "k", amount: 500 });
    expect(d.d).toBe(500);
    expect(d.k).toBe(-500);
  });
});

describe("simplifyDebts", () => {
  it("minimizes transfers for simple case", () => {
    const edges = simplifyDebts({
      a: 300,
      b: -100,
      c: -200,
    });
    expect(edges.length).toBeLessThanOrEqual(2);
    const total = edges.reduce((s, e) => s + e.amount, 0);
    expect(total).toBeCloseTo(300, 5);
  });
});
