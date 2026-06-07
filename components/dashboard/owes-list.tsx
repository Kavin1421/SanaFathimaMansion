"use client";

import { sendSettlementNudgeAction } from "@/app/actions/settlements";
import { SettlementConfirmDialog } from "@/components/settlements/settlement-confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isHouseAdminUser } from "@/lib/roles";
import { queryKeys } from "@/lib/query-keys";
import { formatInr } from "@/lib/utils";
import type { MonthlySummary, SettlementSuggestion } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BellRing } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function OwesList({ summary, monthKey }: { summary: MonthlySummary; monthKey: string }) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const actorLedgerUserId = session?.user?.ledgerUserId ?? null;
  const isHouseAdmin = isHouseAdminUser(session?.user);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [nudgeKey, setNudgeKey] = useState<string | null>(null);
  const [tone, setTone] = useState<"friendly" | "firm" | "custom">("friendly");
  const [customMessage, setCustomMessage] = useState("");
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelTelegram, setChannelTelegram] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);
  const [settleSuggestion, setSettleSuggestion] = useState<SettlementSuggestion | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);

  const nudgeMut = useMutation({
    mutationFn: async (p: { fromUserId: string; toUserId: string; amount: number }) => {
      const r = await sendSettlementNudgeAction({
        fromUserId: p.fromUserId,
        toUserId: p.toUserId,
        amount: p.amount,
        tone,
        customMessage: tone === "custom" ? customMessage : undefined,
        channels: {
          inApp: channelInApp,
          telegram: channelTelegram,
          email: channelEmail,
        },
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Nudge sent");
      setNudgeOpen(false);
      setCustomMessage("");
      qc.invalidateQueries({ queryKey: queryKeys.auditLogs({}) });
      qc.invalidateQueries({ queryKey: queryKeys.notificationEvents({}) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { suggestions } = summary;
  const activeNudgeSuggestion = useMemo(
    () => suggestions.find((x, i) => `${x.fromUserId}-${x.toUserId}-${i}` === nudgeKey) ?? null,
    [nudgeKey, suggestions],
  );

  function openSettle(suggestion: SettlementSuggestion) {
    setSettleSuggestion(suggestion);
    setSettleOpen(true);
  }

  return (
    <section className="dashboard-surface col-span-12 p-6 md:p-8">
      <div className="mb-8">
        <h3 className="text-lg font-semibold tracking-tight">Who owes whom</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Suggested transfers to settle up — same math as Splitwise-style simplified debts.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Everyone is square. Nothing to settle.</p>
      ) : (
        <ul className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
          {suggestions.map((x, i) => (
            (() => {
              const canSettle =
                isHouseAdmin ||
                (actorLedgerUserId != null &&
                  (actorLedgerUserId === x.fromUserId || actorLedgerUserId === x.toUserId));
              return (
            <li
              key={`${x.fromUserId}-${x.toUserId}-${i}`}
              className="flex flex-col gap-4 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Avatar className="h-11 w-11 border border-slate-200/80 shadow-sm dark:border-slate-700">
                  <AvatarFallback className="bg-red-500/10 text-sm font-semibold text-red-700 dark:text-red-400">
                    {initials(x.fromName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm text-muted-foreground">Owes</p>
                  <p className="text-sm leading-relaxed sm:text-base">
                    <span className="font-semibold text-red-600 dark:text-red-400">{x.fromName}</span>
                    <span className="text-muted-foreground"> owes </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {x.toName}
                    </span>
                    <span className="font-bold tabular-nums text-foreground">
                      {" "}
                      {formatInr(x.amount)}
                    </span>
                  </p>
                </div>

                <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 sm:block" />

                <Avatar className="hidden h-11 w-11 border border-slate-200/80 shadow-sm dark:border-slate-700 sm:flex">
                  <AvatarFallback className="bg-emerald-500/10 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {initials(x.toName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <Button
                className="w-full shrink-0 rounded-xl sm:w-auto"
                disabled={!canSettle}
                title={!canSettle ? "Only participants (or an admin) can mark this settlement." : undefined}
                onClick={() => openSettle(x)}
              >
                Mark as Settled
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full shrink-0 rounded-xl sm:w-auto"
                disabled={!canSettle}
                onClick={() => {
                  setNudgeKey(`${x.fromUserId}-${x.toUserId}-${i}`);
                  setTone("friendly");
                  setCustomMessage("");
                  setChannelInApp(true);
                  setChannelTelegram(true);
                  setChannelEmail(true);
                  setNudgeOpen(true);
                }}
              >
                <BellRing className="mr-1.5 h-4 w-4" />
                Nudge
              </Button>
            </li>
              );
            })()
          ))}
        </ul>
      )}

      <SettlementConfirmDialog
        open={settleOpen}
        onOpenChange={(o) => {
          setSettleOpen(o);
          if (!o) setSettleSuggestion(null);
        }}
        suggestion={settleSuggestion}
        balances={summary.balances}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: queryKeys.dashboard(monthKey) });
          qc.invalidateQueries({ queryKey: queryKeys.users });
        }}
      />

      <Dialog open={nudgeOpen} onOpenChange={setNudgeOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Smart Nudge Composer</DialogTitle>
          </DialogHeader>
          {activeNudgeSuggestion ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send reminder to <span className="font-medium text-foreground">{activeNudgeSuggestion.fromName}</span> for{" "}
                <span className="font-medium text-foreground">{formatInr(activeNudgeSuggestion.amount)}</span> owed to{" "}
                <span className="font-medium text-foreground">{activeNudgeSuggestion.toName}</span>.
              </p>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as "friendly" | "firm" | "custom")}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="firm">Firm</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tone === "custom" ? (
                <div className="space-y-2">
                  <Label>Custom message</Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="min-h-[96px] rounded-xl"
                    placeholder="Write your reminder message..."
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Channels</Label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant={channelInApp ? "default" : "outline"} className="rounded-xl" onClick={() => setChannelInApp((v) => !v)}>
                    In-app
                  </Button>
                  <Button type="button" size="sm" variant={channelTelegram ? "default" : "outline"} className="rounded-xl" onClick={() => setChannelTelegram((v) => !v)}>
                    Telegram
                  </Button>
                  <Button type="button" size="sm" variant={channelEmail ? "default" : "outline"} className="rounded-xl" onClick={() => setChannelEmail((v) => !v)}>
                    Email
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setNudgeOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={
                nudgeMut.isPending ||
                !activeNudgeSuggestion ||
                (!channelInApp && !channelTelegram && !channelEmail) ||
                (tone === "custom" && customMessage.trim().length < 3)
              }
              onClick={() =>
                activeNudgeSuggestion &&
                nudgeMut.mutate({
                  fromUserId: activeNudgeSuggestion.fromUserId,
                  toUserId: activeNudgeSuggestion.toUserId,
                  amount: activeNudgeSuggestion.amount,
                })
              }
            >
              Send nudge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
