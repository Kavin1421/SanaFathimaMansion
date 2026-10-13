import { describe, expect, it } from "vitest";
import { formatWhatsAppExpense } from "./whatsapp-message";

describe("formatWhatsAppExpense", () => {
  it("lays out a created expense with split and wallet", () => {
    const text = formatWhatsAppExpense({
      houseName: "SanaFathima Mansion",
      variant: "created",
      title: "Evening vegetables",
      amount: 48,
      payerName: "Kavinkumar K",
      category: "Groceries",
      dateLine: "14 Oct 2026",
      description: "Market run",
      splitMembers: [
        { name: "Rajesh", amount: 24 },
        { name: "Roshan", amount: 24 },
      ],
      walletRemaining: 12400,
      totalSpent: 17600,
      budget: 30000,
      detailUrl: "https://sana.campusresults.co.in/expenses?month=2026-10",
    });

    expect(text.startsWith("SanaFathima Mansion\nNew expense")).toBe(true);
    expect(text).toContain("*Evening vegetables*");
    expect(text).toContain("*₹48*");
    expect(text).toContain("Rajesh  ·  ₹24");
    expect(text).toContain("₹12,400 remaining");
    expect(text).toContain("https://sana.campusresults.co.in/expenses?month=2026-10");
  });

  it("states who was paid on a settlement", () => {
    const text = formatWhatsAppExpense({
      houseName: "SanaFathima Mansion",
      variant: "settlement",
      title: "Settlement",
      amount: 500,
      payerName: "Dinesh",
      category: "Settlement",
      dateLine: "14 Oct 2026",
      settlementToName: "Roshan",
    });
    expect(text).toContain("*Dinesh* paid *Roshan*");
    expect(text).toContain("*₹500*");
  });
});
