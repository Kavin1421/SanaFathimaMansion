import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CloudOff,
  Home,
  Inbox,
  PartyPopper,
  PieChart,
} from "lucide-react";

export type LottieSceneKey =
  | "homeWallet"
  | "emptyChart"
  | "emptyInbox"
  | "allCaughtUp"
  | "successCheck"
  | "expenseAdded"
  | "shoppingDone"
  | "activityQuiet"
  | "gentleError";

export type LottieScene = {
  src: string;
  w: number;
  h: number;
  loop: boolean;
  speed: number;
  fallback: LucideIcon;
};

export const LOTTIE_SCENES: Record<LottieSceneKey, LottieScene> = {
  homeWallet: {
    src: "/lottie/home-wallet.json",
    w: 160,
    h: 160,
    loop: true,
    speed: 0.65,
    fallback: Home,
  },
  emptyChart: {
    src: "/lottie/empty-chart.json",
    w: 140,
    h: 140,
    loop: true,
    speed: 0.7,
    fallback: PieChart,
  },
  emptyInbox: {
    src: "/lottie/empty-inbox.json",
    w: 140,
    h: 140,
    loop: true,
    speed: 0.7,
    fallback: Inbox,
  },
  allCaughtUp: {
    src: "/lottie/all-caught-up.json",
    w: 140,
    h: 140,
    loop: true,
    speed: 0.65,
    fallback: CheckCircle2,
  },
  successCheck: {
    src: "/lottie/success-check.json",
    w: 120,
    h: 120,
    loop: false,
    speed: 1,
    fallback: CheckCircle2,
  },
  expenseAdded: {
    src: "/lottie/expense-added.json",
    w: 180,
    h: 180,
    loop: false,
    speed: 1,
    fallback: CheckCircle2,
  },
  shoppingDone: {
    src: "/lottie/shopping-done.json",
    w: 100,
    h: 100,
    loop: false,
    speed: 1,
    fallback: PartyPopper,
  },
  activityQuiet: {
    src: "/lottie/activity-quiet.json",
    w: 130,
    h: 130,
    loop: true,
    speed: 0.65,
    fallback: Activity,
  },
  gentleError: {
    src: "/lottie/gentle-error.json",
    w: 120,
    h: 120,
    loop: true,
    speed: 0.6,
    fallback: CloudOff,
  },
};

export function getLottieScene(key: LottieSceneKey): LottieScene {
  return LOTTIE_SCENES[key];
}

/** For chart-style empties that share the same visual. */
export const LOTTIE_CHART_FALLBACK = BarChart3;
