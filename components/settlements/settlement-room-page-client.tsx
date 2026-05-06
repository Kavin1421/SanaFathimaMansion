"use client";

import {
  confirmSettlementAction,
  sendSettlementNudgeAction,
  settleAction,
} from "@/app/actions/settlements";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import { useMonthParam } from "@/hooks/use-month";
import type { MonthlySummary, SettlementDTO, UserDTO } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export function SettlementRoomPageClient() {
  const qc = useQueryClient();
  const { monthKey } = useMonthParam();
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalText, setProposalText] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [proposalTarget, setProposalTarget] = useState<{ fromUserId: string; toUserId: string; amount: number } | null>(
    null,
  );

  const dashboardQ = useQuery({
    queryKey: queryKeys.dashboard(monthKey),
    queryFn: async (): Promise<MonthlySummary> => {
      const res = await fetch(`/api/dashboard?month=${encodeURIComponent(monthKey)}`);
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });
  const usersQ = useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<UserDTO[]> => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });
  const settlementsQ = useQuery({
    queryKey: queryKeys.settlements,
    queryFn: async (): Promise<SettlementDTO[]> => {
      const res = await fetch("/api/settlements");
      if (!res.ok) throw new Error("Failed to load settlements");
      return res.json();
    },
  });

  const settleMut = useMutation({
    mutationFn: async (p: { fromUser: string; toUser: string; amount: number }) => {
      const r = await settleAction({ ...p, date: new Date() });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Marked as paid");
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
      qc.invalidateQueries({ queryKey: queryKeys.settlements });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmMut = useMutation({
    mutationFn: async (settlementId: string) => {
      const r = await confirmSettlementAction({ settlementId });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Settlement confirmed");
      qc.invalidateQueries({ queryKey: queryKeys.settlements });
      qc.invalidateQueries({ queryKey: queryKeys.auditLogs({}) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proposalMut = useMutation({
    mutationFn: async () => {
      if (!proposalTarget) throw new Error("Select settlement first");
      const amount = Number(proposalAmount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid proposed amount");
      const customMessage = `Proposed split change: settle ${formatInr(amount)} instead of ${formatInr(
        proposalTarget.amount,
      )}. ${proposalText.trim()}`;
      const r = await sendSettlementNudgeAction({
        fromUserId: proposalTarget.fromUserId,
        toUserId: proposalTarget.toUserId,
        amount,
        tone: "custom",
        customMessage,
        channels: { inApp: true, whatsapp: true, email: true },
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Proposal sent");
      setProposalOpen(false);
      setProposalText("");
      setProposalAmount("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (dashboardQ.isLoading || usersQ.isLoading || settlementsQ.isLoading) {
    return <Card className="rounded-2xl p-6">Loading settlement room...</Card>;
  }
  if (dashboardQ.isError || usersQ.isError || settlementsQ.isError || !dashboardQ.data || !usersQ.data || !settlementsQ.data) {
    return <Card className="rounded-2xl p-6">Could not load settlement room.</Card>;
  }

  const summary = dashboardQ.data;
  const suggestions = summary.suggestions;
  const users = usersQ.data;
  const userMap = new Map(users.map((u) => [u._id, u.name]));
  const recentSettlements = settlementsQ.data.slice(0, 20);

  return (
    <div className="grid gap-5 md:gap-6">
      <Card className="rounded-2xl p-5 md:p-6">
        <h2 className="text-lg font-semibold">Pending suggestions</h2>
        <p className="mt-1 text-sm text-muted-foreground">Mark paid or propose a split adjustment.</p>
        <div className="mt-4 space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending suggestions right now.</p>
          ) : (
            suggestions.map((s, i) => (
              <div key={`${s.fromUserId}-${s.toUserId}-${i}`} className="rounded-xl border p-3">
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold">{s.fromName}</span> owes <span className="font-semibold">{s.toName}</span>{" "}
                  <span className="font-semibold">{formatInr(s.amount)}</span>
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    size="sm"
                    className="h-9 rounded-xl"
                    onClick={() => settleMut.mutate({ fromUser: s.fromUserId, toUser: s.toUserId, amount: s.amount })}
                    disabled={settleMut.isPending}
                  >
                    Mark paid
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-xl"
                    onClick={() => {
                      setProposalTarget(s);
                      setProposalAmount(String(s.amount));
                      setProposalText("");
                      setProposalOpen(true);
                    }}
                  >
                    Propose split change
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="rounded-2xl p-5 md:p-6">
        <h2 className="text-lg font-semibold">Status timeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">Proposed {"->"} Paid {"->"} Confirmed</p>
        <div className="mt-4 space-y-3">
          {recentSettlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No settlement activity yet.</p>
          ) : (
            recentSettlements.map((s) => (
              <div key={s._id} className="rounded-xl border p-3">
                <p className="text-sm leading-relaxed">
                  {userMap.get(s.fromUser) ?? "Unknown"} {"->"} {userMap.get(s.toUser) ?? "Unknown"} · {formatInr(s.amount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(s.date).toLocaleString()} · {s.status}
                </p>
                {s.status === "completed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-9 rounded-xl"
                    onClick={() => confirmMut.mutate(s._id)}
                    disabled={confirmMut.isPending}
                  >
                    Confirm settlement
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Propose split change</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Proposed amount</Label>
              <Input value={proposalAmount} onChange={(e) => setProposalAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={proposalText} onChange={(e) => setProposalText(e.target.value)} placeholder="Optional context" />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => setProposalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="h-10 rounded-xl" onClick={() => proposalMut.mutate()} disabled={proposalMut.isPending}>
              Send proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
