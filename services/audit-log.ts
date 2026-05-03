import { connectDb } from "@/lib/db";
import type { AuditActionType } from "@/lib/audit-constants";
import { AuditLog, type AuditPerformedBy, type AuditTargetEntity } from "@/models/AuditLog";

export type AppendAuditLogInput = {
  actionType: AuditActionType;
  performedBy: AuditPerformedBy;
  targetEntity: AuditTargetEntity;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
};

export async function appendAuditLog(input: AppendAuditLogInput): Promise<void> {
  await connectDb();
  await AuditLog.create({
    actionType: input.actionType,
    performedBy: input.performedBy,
    targetEntity: input.targetEntity,
    previousValue: input.previousValue ?? null,
    newValue: input.newValue ?? null,
  });
}

export type AuditLogRow = {
  _id: string;
  actionType: AuditActionType;
  performedBy: AuditPerformedBy;
  targetEntity: AuditTargetEntity;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
};

export async function listAuditLogs(params: {
  accountId?: string;
  actionType?: AuditActionType;
  from?: Date;
  to?: Date;
  limit: number;
  skip: number;
}): Promise<{ rows: AuditLogRow[]; total: number }> {
  await connectDb();
  const q: Record<string, unknown> = {};
  if (params.accountId) q["performedBy.accountId"] = params.accountId;
  if (params.actionType) q.actionType = params.actionType;
  if (params.from || params.to) {
    q.createdAt = {};
    if (params.from) (q.createdAt as Record<string, Date>).$gte = params.from;
    if (params.to) (q.createdAt as Record<string, Date>).$lte = params.to;
  }

  const [rows, total] = await Promise.all([
    AuditLog.find(q)
      .sort({ createdAt: -1 })
      .skip(params.skip)
      .limit(params.limit)
      .lean()
      .exec(),
    AuditLog.countDocuments(q),
  ]);

  return {
    total,
    rows: rows.map((r) => ({
      _id: String(r._id),
      actionType: r.actionType as AuditActionType,
      performedBy: r.performedBy,
      targetEntity: r.targetEntity,
      previousValue: (r.previousValue as Record<string, unknown> | null) ?? null,
      newValue: (r.newValue as Record<string, unknown> | null) ?? null,
      createdAt: (r as { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
    })),
  };
}

export async function listDistinctPerformerSummaries(): Promise<AuditPerformedBy[]> {
  await connectDb();
  const rows = await AuditLog.aggregate<{ performedBy: AuditPerformedBy }>([
    { $group: { _id: "$performedBy.accountId", performedBy: { $first: "$performedBy" } } },
    { $sort: { "performedBy.email": 1 } },
  ]);
  return rows.map((r) => r.performedBy);
}
