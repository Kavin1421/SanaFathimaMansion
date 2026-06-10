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
  /** Linked sign-in account, when the roommate has registered. */
  account?: {
    id: string;
    role: "admin" | "user";
    isSuperAdmin: boolean;
  } | null;
};

export type ExpenseDTO = {
  _id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string;
  splitEnabled: boolean;
  splitMode?: "equal" | "custom";
  splitBetween: string[];
  splitAmounts?: { userId: string; amount: number }[];
  date: string;
  notes?: string;
  description?: string;
  billImage?: string;
  billImages?: string[];
  status?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  currency?: string;
  originalAmount?: number;
  exchangeRate?: number;
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
  proofUrl?: string;
  note?: string;
};

export type WalletAmendmentDTO = {
  id: string;
  monthKey: string;
  previousBudget: number;
  additionalAmount: number;
  newBudget: number;
  performedByName: string;
  createdAt: string;
};

export type RecurringExpenseDTO = {
  _id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string;
  splitEnabled: boolean;
  splitMode: "equal" | "custom";
  splitBetween: string[];
  dayOfMonth: number;
  active: boolean;
  lastPostedMonthKey?: string;
};

export type SavingsGoalDTO = {
  _id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  active: boolean;
  progress: number;
};

export type MonthlyStoryDTO = {
  monthKey: string;
  monthLabel: string;
  totalSpent: number;
  previousMonthTotal: number;
  percentChange?: number;
  topCategory?: { category: ExpenseCategory; total: number; emoji: string };
  biggestExpense?: { title: string; amount: number };
  topSpender?: { name: string; totalPaid: number };
  walletUsedPercent?: number;
  pendingApprovals: number;
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
  overspendAcknowledged?: boolean;
  pendingExpensesCount: number;
  recurringDueCount: number;
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
