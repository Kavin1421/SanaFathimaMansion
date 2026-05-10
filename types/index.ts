import type { ExpenseCategory, PreBillUnit } from "@/lib/constants";

export type { ExpenseCategory, PreBillUnit };

export type PreBillItemDTO = {
  name: string;
  quantity: number;
  unit: PreBillUnit;
  price?: number;
  /** Whether this line has been checked off while shopping */
  isPurchased?: boolean;
  /** ISO timestamp when marked purchased */
  purchasedAt?: string;
};

export type PreBillDTO = {
  _id: string;
  title: string;
  category: ExpenseCategory;
  notes?: string;
  createdBy: string;
  items: PreBillItemDTO[];
  status: "draft" | "finalized";
  linkedExpenseId?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserDTO = {
  _id: string;
  name: string;
  email: string;
  status: "invited" | "active" | "disabled";
  invitedAt?: string;
  activatedAt?: string;
  reminderPreferences?: {
    frequency: "daily" | "weekly";
    channels: {
      email: boolean;
      telegram: boolean;
    };
    quietHours: {
      startHour: number;
      endHour: number;
    };
  };
  avatar?: string;
  totalPaid: number;
  balance: number;
};

export type ExpenseDTO = {
  _id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string;
  splitEnabled: boolean;
  splitBetween: string[];
  date: string;
  notes?: string;
  description?: string;
  billImage?: string;
  comments?: {
    _id: string;
    accountId: string;
    authorName: string;
    text: string;
    createdAt: string;
  }[];
  reactions?: {
    emoji: string;
    accountId: string;
    authorName: string;
    createdAt: string;
  }[];
};

export type SettlementDTO = {
  _id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  date: string;
  status: "pending" | "completed" | "confirmed";
  confirmedBy?: string;
  confirmedAt?: string;
};

export type SettlementSuggestion = {
  fromUserId: string;
  toUserId: string;
  amount: number;
  fromName: string;
  toName: string;
};

export type DailySpendPoint = {
  date: string;
  amount: number;
  cumulative: number;
  /** Cumulative spend in the previous month through the same day-of-month (aligned comparison). */
  priorMonthCumulative: number;
};

export type RecentExpenseRow = ExpenseDTO & { paidByName: string };

export type MonthlySummary = {
  monthKey: string;
  monthLabel: string;
  totalSpent: number;
  rentTotal: number;
  groceryTotal: number;
  vegetableTotal: number;
  gasTotal: number;
  miscTotal: number;
  othersTotal: number;
  /** Monthly wallet cap from HouseMonth; null if not configured */
  monthBudget: number | null;
  monthRemaining: number | null;
  monthWalletProgress: number | null;
  budgetAlertLevel: "none" | "warn" | "over";
  topSpenderLabel?: string;
  categoryBreakdown: { category: ExpenseCategory; total: number; emoji: string }[];
  perUserContribution: { userId: string; name: string; paid: number }[];
  perUserShare: { userId: string; name: string; share: number }[];
  previousMonthTotal?: number;
  percentChangeVsPrevious?: number;
  monthlyWinner?: { userId: string; name: string; totalPaid: number };
  insight?: string;
  pendingBalanceMagnitude: number;
  balances: { userId: string; name: string; balance: number }[];
  personalBalances: { userId: string; name: string; totalPaid: number; totalOwed: number; netBalance: number }[];
  suggestions: SettlementSuggestion[];
  recentExpenses: ExpenseDTO[];
  recentExpensesDetailed: RecentExpenseRow[];
  dailySpend: DailySpendPoint[];
};
