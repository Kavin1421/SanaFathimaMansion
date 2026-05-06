export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SanaFathima Mansion API",
    version: "1.0.0",
    description:
      "API documentation for the shared expense tracker platform (auth, expenses, users, audit, notifications, onboarding, uploads, and cron hooks).",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Auth" },
    { name: "Dashboard" },
    { name: "Expenses" },
    { name: "Users" },
    { name: "House" },
    { name: "Onboarding" },
    { name: "Audit" },
    { name: "Notifications" },
    { name: "Uploads" },
    { name: "Cron" },
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
        },
      },
      Expense: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          amount: { type: "number" },
          category: { type: "string" },
          paidBy: { type: "string" },
          splitEnabled: { type: "boolean" },
          splitBetween: { type: "array", items: { type: "string" } },
          date: { type: "string" },
          notes: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          billImage: { type: "string", nullable: true },
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
          channel: { type: "string", enum: ["email", "whatsapp"] },
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
                  password: { type: "string" },
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
      get: { tags: ["Auth"], summary: "NextAuth handler" },
      post: { tags: ["Auth"], summary: "NextAuth handler" },
    },
    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get monthly dashboard summary",
        parameters: [{ in: "query", name: "month", schema: { type: "string", example: "2026-05" } }],
        responses: { 200: { description: "Summary" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/expenses": {
      get: {
        tags: ["Expenses"],
        summary: "List expenses",
        parameters: [
          { in: "query", name: "month", schema: { type: "string" } },
          { in: "query", name: "category", schema: { type: "string" } },
          { in: "query", name: "paidBy", schema: { type: "string" } },
          { in: "query", name: "search", schema: { type: "string" } },
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
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List users",
        responses: {
          200: {
            description: "User list",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/User" } } } },
          },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Invite/create user (super admin)",
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
        responses: { 200: { description: "User created" }, 400: { description: "Validation error" }, 403: { description: "Forbidden" } },
      },
    },
    "/api/house": {
      get: { tags: ["House"], summary: "Get house settings", responses: { 200: { description: "House settings" } } },
      post: {
        tags: ["House"],
        summary: "Update house display name",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["displayName"], properties: { displayName: { type: "string" } } } } },
        },
        responses: { 200: { description: "Updated" } },
      },
    },
    "/api/onboarding/complete": {
      post: { tags: ["Onboarding"], summary: "Mark onboarding complete", responses: { 200: { description: "Completed" } } },
    },
    "/api/upload": {
      post: {
        tags: ["Uploads"],
        summary: "Upload bill image to Cloudinary",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { type: "object", properties: { file: { type: "string", format: "binary" } }, required: ["file"] },
            },
          },
        },
        responses: { 200: { description: "Uploaded" }, 400: { description: "No file" } },
      },
    },
    "/api/audit-logs": {
      get: {
        tags: ["Audit"],
        summary: "List audit logs (super admin)",
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
            description: "Audit rows",
            content: { "application/json": { schema: { type: "object", properties: { rows: { type: "array", items: { $ref: "#/components/schemas/AuditLogRow" } }, total: { type: "integer" }, page: { type: "integer" }, limit: { type: "integer" } } } } },
          },
        },
      },
    },
    "/api/audit-logs/performers": { get: { tags: ["Audit"], summary: "List audit performers", responses: { 200: { description: "Performers" } } } },
    "/api/notification-events": {
      get: {
        tags: ["Notifications"],
        summary: "List notification delivery events (super admin)",
        parameters: [
          { in: "query", name: "channel", schema: { type: "string", enum: ["email", "whatsapp"] } },
          { in: "query", name: "status", schema: { type: "string", enum: ["sent", "failed", "skipped"] } },
          { in: "query", name: "eventType", schema: { type: "string" } },
          { in: "query", name: "search", schema: { type: "string" } },
          { in: "query", name: "page", schema: { type: "integer" } },
          { in: "query", name: "limit", schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Notification event rows",
            content: { "application/json": { schema: { type: "object", properties: { rows: { type: "array", items: { $ref: "#/components/schemas/NotificationEventRow" } }, total: { type: "integer" }, page: { type: "integer" }, limit: { type: "integer" } } } } },
          },
        },
      },
    },
    "/api/cron/reminders": {
      post: {
        tags: ["Cron"],
        summary: "Run daily reminders",
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
