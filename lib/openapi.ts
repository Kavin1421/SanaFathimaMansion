export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SanaFathima Mansion API",
    version: "1.1.0",
    description:
      "REST API for the shared household expense tracker. Session cookie auth (NextAuth) for household routes; `x-cron-secret` for cron hooks. Many write operations (expense create/update, wallet amend, approvals) also run via Next.js server actions from the UI — this spec covers HTTP routes only.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Auth", description: "Registration and NextAuth session" },
    { name: "Dashboard", description: "Monthly summary and story card" },
    { name: "Expenses", description: "Expense listing and approval queue" },
    { name: "Settlements", description: "Recorded transfers between roommates" },
    { name: "Users", description: "Household member ledger and invites" },
    { name: "House", description: "Display name and budget threshold settings" },
    { name: "Wallet", description: "Monthly wallet funding history" },
    { name: "Reports", description: "CSV and PDF exports" },
    { name: "Activity", description: "Recent household activity feed" },
    { name: "Pre-Bills", description: "Shared shopping lists" },
    { name: "Savings Goals", description: "Household savings pots" },
    { name: "Recurring Expenses", description: "Rent/Wi‑Fi templates and post-now" },
    { name: "Onboarding", description: "First-run setup" },
    { name: "Audit", description: "Super admin audit trail" },
    { name: "Notifications", description: "Super admin delivery telemetry" },
    { name: "Uploads", description: "Cloudinary bill images" },
    { name: "Cron", description: "Scheduled jobs (secret header)" },
  ],
  components: {
    securitySchemes: {
      sessionAuth: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "Browser session cookie from NextAuth login.",
      },
      cronSecret: {
        type: "apiKey",
        in: "header",
        name: "x-cron-secret",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: { error: { type: "string" } },
      },
      User: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          status: { type: "string", enum: ["invited", "active", "disabled"] },
          invitedAt: { type: "string", nullable: true },
          activatedAt: { type: "string", nullable: true },
          avatar: { type: "string", nullable: true },
          totalPaid: { type: "number" },
          balance: { type: "number" },
          account: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              role: { type: "string", enum: ["admin", "user"] },
              isSuperAdmin: { type: "boolean" },
            },
          },
        },
      },
      Expense: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          amount: { type: "number", description: "Amount in INR (ledger currency)" },
          category: { type: "string" },
          paidBy: { type: "string" },
          splitEnabled: { type: "boolean" },
          splitMode: { type: "string", enum: ["equal", "custom"], nullable: true },
          splitBetween: { type: "array", items: { type: "string" } },
          splitAmounts: {
            type: "array",
            nullable: true,
            items: {
              type: "object",
              properties: { userId: { type: "string" }, amount: { type: "number" } },
            },
          },
          date: { type: "string", format: "date-time" },
          notes: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          billImage: { type: "string", nullable: true },
          status: { type: "string", enum: ["pending", "approved", "rejected"], nullable: true },
          rejectionReason: { type: "string", nullable: true },
          currency: { type: "string", example: "INR" },
          originalAmount: { type: "number", nullable: true },
          exchangeRate: { type: "number", nullable: true },
        },
      },
      Settlement: {
        type: "object",
        properties: {
          _id: { type: "string" },
          fromUser: { type: "string" },
          toUser: { type: "string" },
          amount: { type: "number" },
          date: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["pending", "completed", "confirmed"] },
          confirmedBy: { type: "string", nullable: true },
          confirmedAt: { type: "string", nullable: true },
          proofUrl: { type: "string", nullable: true },
          note: { type: "string", nullable: true },
        },
      },
      WalletAmendment: {
        type: "object",
        properties: {
          id: { type: "string" },
          monthKey: { type: "string", example: "2026-06" },
          previousBudget: { type: "number" },
          additionalAmount: { type: "number" },
          newBudget: { type: "number" },
          performedByName: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      HouseSettings: {
        type: "object",
        properties: {
          displayName: { type: "string" },
          budgetThresholdWarn: { type: "number", example: 0.8, description: "Fraction of budget for warn alert" },
          budgetThresholdOver: { type: "number", example: 1, description: "Fraction of budget for over alert" },
          overspendAcknowledgedMonthKey: { type: "string", nullable: true, example: "2026-06" },
        },
      },
      ActivityItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["expense", "settlement", "pre_bill"] },
          title: { type: "string" },
          subtitle: { type: "string", nullable: true },
          amount: { type: "number", nullable: true },
          actorName: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      MonthlyStory: {
        type: "object",
        properties: {
          monthKey: { type: "string" },
          monthLabel: { type: "string" },
          totalSpent: { type: "number" },
          previousMonthTotal: { type: "number" },
          percentChange: { type: "number", nullable: true },
          topCategory: {
            type: "object",
            nullable: true,
            properties: { category: { type: "string" }, total: { type: "number" }, emoji: { type: "string" } },
          },
          biggestExpense: {
            type: "object",
            nullable: true,
            properties: { title: { type: "string" }, amount: { type: "number" } },
          },
          topSpender: {
            type: "object",
            nullable: true,
            properties: { name: { type: "string" }, totalPaid: { type: "number" } },
          },
          walletUsedPercent: { type: "number", nullable: true },
          pendingApprovals: { type: "integer" },
        },
      },
      PreBill: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          category: { type: "string" },
          notes: { type: "string", nullable: true },
          createdBy: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
                price: { type: "number", nullable: true },
                isPurchased: { type: "boolean" },
                purchasedAt: { type: "string", nullable: true },
              },
            },
          },
          status: { type: "string", enum: ["draft", "finalized"] },
          linkedExpenseId: { type: "string", nullable: true },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
        },
      },
      SavingsGoal: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          targetAmount: { type: "number" },
          currentAmount: { type: "number" },
          active: { type: "boolean" },
          progress: { type: "number", description: "0–1 fraction toward target" },
        },
      },
      RecurringExpense: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          amount: { type: "number" },
          category: { type: "string" },
          paidBy: { type: "string" },
          splitEnabled: { type: "boolean" },
          splitMode: { type: "string", enum: ["equal", "custom"] },
          splitBetween: { type: "array", items: { type: "string" } },
          dayOfMonth: { type: "integer", minimum: 1, maximum: 28 },
          active: { type: "boolean" },
          lastPostedMonthKey: { type: "string", nullable: true },
        },
      },
      AuditLogRow: {
        type: "object",
        properties: {
          _id: { type: "string" },
          actionType: { type: "string" },
          performedBy: { type: "object" },
          targetEntity: { type: "object" },
          previousValue: { type: "object", nullable: true },
          newValue: { type: "object", nullable: true },
          createdAt: { type: "string" },
        },
      },
      NotificationEventRow: {
        type: "object",
        properties: {
          _id: { type: "string" },
          channel: { type: "string", enum: ["email", "telegram"] },
          eventType: { type: "string" },
          status: { type: "string", enum: ["sent", "failed", "skipped"] },
          recipient: { type: "string", nullable: true },
          message: { type: "string", nullable: true },
          metadata: { type: "object", nullable: true },
          createdAt: { type: "string" },
        },
      },
    },
  },
  security: [{ sessionAuth: [] }],
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register account",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Registered" },
          400: { description: "Validation error" },
        },
      },
    },
    "/api/auth/[...nextauth]": {
      get: { tags: ["Auth"], summary: "NextAuth session handler", security: [] },
      post: { tags: ["Auth"], summary: "NextAuth sign-in/out handler", security: [] },
    },
    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get monthly dashboard summary",
        parameters: [{ in: "query", name: "month", schema: { type: "string", example: "2026-06" } }],
        responses: {
          200: { description: "MonthlySummary (balances, wallet, suggestions, etc.)" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/dashboard/story": {
      get: {
        tags: ["Dashboard"],
        summary: "Get shareable monthly story card data",
        parameters: [{ in: "query", name: "month", schema: { type: "string", example: "2026-06" } }],
        responses: {
          200: {
            description: "Monthly story",
            content: { "application/json": { schema: { $ref: "#/components/schemas/MonthlyStory" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/activity": {
      get: {
        tags: ["Activity"],
        summary: "Recent household activity feed",
        parameters: [
          { in: "query", name: "limit", schema: { type: "integer", default: 20, minimum: 1, maximum: 50 } },
        ],
        responses: {
          200: {
            description: "Activity items",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ActivityItem" } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/expenses": {
      get: {
        tags: ["Expenses"],
        summary: "List expenses",
        parameters: [
          { in: "query", name: "month", schema: { type: "string", example: "2026-06" } },
          { in: "query", name: "category", schema: { type: "string" } },
          { in: "query", name: "paidBy", schema: { type: "string" } },
          { in: "query", name: "search", schema: { type: "string" } },
          {
            in: "query",
            name: "includePending",
            schema: { type: "boolean", default: false },
            description: "Include pending-approval expenses (admin review)",
          },
        ],
        responses: {
          200: {
            description: "Expense list",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Expense" } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/expenses/pending": {
      get: {
        tags: ["Expenses"],
        summary: "List pending expenses awaiting admin approval",
        description: "House admin only.",
        responses: {
          200: {
            description: "Pending expenses",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Expense" } } } },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden — house admin required" },
        },
      },
    },
    "/api/settlements": {
      get: {
        tags: ["Settlements"],
        summary: "List all settlements",
        responses: {
          200: {
            description: "Settlement list",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Settlement" } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List household users",
        responses: {
          200: {
            description: "User list with balances and linked account roles",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/User" } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Invite / create household user",
        description: "House admin only.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  avatar: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User created" },
          400: { description: "Validation error" },
          403: { description: "Forbidden — house admin required" },
        },
      },
    },
    "/api/house": {
      get: {
        tags: ["House"],
        summary: "Get house display name",
        responses: { 200: { description: "{ displayName }" }, 401: { description: "Unauthorized" } },
      },
      post: {
        tags: ["House"],
        summary: "Update house display name",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["displayName"],
                properties: { displayName: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Updated" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/house/settings": {
      get: {
        tags: ["House"],
        summary: "Get house settings (budget thresholds, overspend ack)",
        responses: {
          200: {
            description: "House settings",
            content: { "application/json": { schema: { $ref: "#/components/schemas/HouseSettings" } } },
          },
          401: { description: "Unauthorized" },
        },
      },
      patch: {
        tags: ["House"],
        summary: "Update budget alert thresholds",
        description: "House admin only.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  budgetThresholdWarn: { type: "number", minimum: 0, maximum: 1, example: 0.8 },
                  budgetThresholdOver: { type: "number", minimum: 0, maximum: 1, example: 1 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated settings", content: { "application/json": { schema: { $ref: "#/components/schemas/HouseSettings" } } } },
          400: { description: "Validation error" },
          403: { description: "Forbidden" },
        },
      },
      post: {
        tags: ["House"],
        summary: "Acknowledge budget overspend for a month",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["monthKey"],
                properties: { monthKey: { type: "string", example: "2026-06" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Acknowledged" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/wallet/history": {
      get: {
        tags: ["Wallet"],
        summary: "List wallet funding amendments (audit-derived)",
        parameters: [
          {
            in: "query",
            name: "month",
            schema: { type: "string", example: "2026-06" },
            description: "Optional YYYY-MM filter",
          },
        ],
        responses: {
          200: {
            description: "Wallet amendment rows",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/WalletAmendment" } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/report/csv": {
      get: {
        tags: ["Reports"],
        summary: "Export expenses CSV for a month",
        parameters: [{ in: "query", name: "month", schema: { type: "string", example: "2026-06" } }],
        responses: {
          200: { description: "text/csv attachment", content: { "text/csv": { schema: { type: "string", format: "binary" } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/report/wallet-csv": {
      get: {
        tags: ["Reports"],
        summary: "Export wallet funding history CSV",
        parameters: [{ in: "query", name: "month", schema: { type: "string", example: "2026-06" } }],
        responses: {
          200: { description: "text/csv attachment", content: { "text/csv": { schema: { type: "string", format: "binary" } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/report/pdf": {
      get: {
        tags: ["Reports"],
        summary: "Download monthly report PDF",
        parameters: [{ in: "query", name: "month", schema: { type: "string", example: "2026-06" } }],
        responses: {
          200: { description: "application/pdf attachment", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/savings-goals": {
      get: {
        tags: ["Savings Goals"],
        summary: "List savings goals",
        responses: {
          200: {
            description: "Goals",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/SavingsGoal" } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Savings Goals"],
        summary: "Create a savings goal",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "targetAmount"],
                properties: {
                  title: { type: "string" },
                  targetAmount: { type: "number", exclusiveMinimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created goal", content: { "application/json": { schema: { $ref: "#/components/schemas/SavingsGoal" } } } },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/savings-goals/{id}/contribute": {
      post: {
        tags: ["Savings Goals"],
        summary: "Contribute to a savings goal",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount"],
                properties: { amount: { type: "number", exclusiveMinimum: 0 } },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated goal", content: { "application/json": { schema: { $ref: "#/components/schemas/SavingsGoal" } } } },
          400: { description: "Validation error" },
          404: { description: "Goal not found" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/recurring-expenses": {
      get: {
        tags: ["Recurring Expenses"],
        summary: "List recurring expense templates",
        responses: {
          200: {
            description: "Templates",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/RecurringExpense" } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Recurring Expenses"],
        summary: "Create recurring expense template",
        description: "House admin only.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "amount", "category", "paidBy", "dayOfMonth"],
                properties: {
                  title: { type: "string" },
                  amount: { type: "number", exclusiveMinimum: 0 },
                  category: { type: "string" },
                  paidBy: { type: "string" },
                  splitEnabled: { type: "boolean", default: true },
                  splitMode: { type: "string", enum: ["equal", "custom"], default: "equal" },
                  splitBetween: { type: "array", items: { type: "string" } },
                  dayOfMonth: { type: "integer", minimum: 1, maximum: 28 },
                  active: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created template" },
          400: { description: "Validation error" },
          403: { description: "Forbidden" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/recurring-expenses/{id}/post": {
      post: {
        tags: ["Recurring Expenses"],
        summary: "Post recurring template as expense for a month",
        description: "House admin only. Creates a ledger expense and marks template posted for that month.",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { monthKey: { type: "string", example: "2026-06", description: "Defaults to current month" } },
              },
            },
          },
        },
        responses: {
          200: { description: "{ recurring, expenseId }" },
          400: { description: "Already posted or validation error" },
          404: { description: "Template not found" },
          403: { description: "Forbidden" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/pre-bills": {
      get: {
        tags: ["Pre-Bills"],
        summary: "List pre-bills (shopping lists)",
        parameters: [
          { in: "query", name: "status", schema: { type: "string", enum: ["draft", "finalized"] } },
        ],
        responses: {
          200: {
            description: "Pre-bill list",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/PreBill" } } } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/pre-bills/{id}": {
      get: {
        tags: ["Pre-Bills"],
        summary: "Get pre-bill by id",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Pre-bill", content: { "application/json": { schema: { $ref: "#/components/schemas/PreBill" } } } },
          404: { description: "Not found" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/pre-bills/{id}/items/{index}": {
      patch: {
        tags: ["Pre-Bills"],
        summary: "Toggle purchased flag on a pre-bill line item",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
          { in: "path", name: "index", required: true, schema: { type: "integer", minimum: 0 } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { isPurchased: { type: "boolean" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated pre-bill", content: { "application/json": { schema: { $ref: "#/components/schemas/PreBill" } } } },
          400: { description: "Invalid index or body" },
          403: { description: "Not linked to household member" },
          404: { description: "Not found" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/onboarding/complete": {
      post: {
        tags: ["Onboarding"],
        summary: "Mark onboarding complete for current account",
        responses: { 200: { description: "Completed" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/upload": {
      post: {
        tags: ["Uploads"],
        summary: "Upload bill image to Cloudinary",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } },
                required: ["file"],
              },
            },
          },
        },
        responses: {
          200: { description: "{ url: string }" },
          400: { description: "No file" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/audit-logs": {
      get: {
        tags: ["Audit"],
        summary: "List audit logs",
        description: "Super admin only.",
        parameters: [
          { in: "query", name: "userId", schema: { type: "string" } },
          { in: "query", name: "actionType", schema: { type: "string" } },
          { in: "query", name: "from", schema: { type: "string", format: "date" } },
          { in: "query", name: "to", schema: { type: "string", format: "date" } },
          { in: "query", name: "page", schema: { type: "integer" } },
          { in: "query", name: "limit", schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Paginated audit rows",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    rows: { type: "array", items: { $ref: "#/components/schemas/AuditLogRow" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/audit-logs/performers": {
      get: {
        tags: ["Audit"],
        summary: "List distinct audit log performers",
        description: "Super admin only.",
        responses: { 200: { description: "Performers list" }, 403: { description: "Forbidden" } },
      },
    },
    "/api/notification-events": {
      get: {
        tags: ["Notifications"],
        summary: "List notification delivery events",
        description: "Super admin only.",
        parameters: [
          { in: "query", name: "channel", schema: { type: "string", enum: ["email", "telegram"] } },
          { in: "query", name: "status", schema: { type: "string", enum: ["sent", "failed", "skipped"] } },
          { in: "query", name: "eventType", schema: { type: "string" } },
          { in: "query", name: "search", schema: { type: "string" } },
          { in: "query", name: "page", schema: { type: "integer" } },
          { in: "query", name: "limit", schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Paginated notification events",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    rows: { type: "array", items: { $ref: "#/components/schemas/NotificationEventRow" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    limit: { type: "integer" },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/openapi": {
      get: {
        tags: ["Audit"],
        summary: "Get this OpenAPI JSON spec",
        description: "Super admin only. Powers the Swagger UI at /api-docs.",
        responses: {
          200: { description: "OpenAPI 3.0 document" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/cron/reminders": {
      post: {
        tags: ["Cron"],
        summary: "Run daily balance reminders",
        security: [{ cronSecret: [] }],
        responses: { 200: { description: "Run result" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/cron/monthly-summary": {
      post: {
        tags: ["Cron"],
        summary: "Run monthly summary broadcast",
        security: [{ cronSecret: [] }],
        responses: { 200: { description: "Run result" }, 401: { description: "Unauthorized" } },
      },
    },
  },
} as const;
