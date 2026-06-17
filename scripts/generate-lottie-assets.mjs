/**
 * @deprecated Use `npm run lottie:fetch` for real LottieFiles assets.
 * This script only writes minimal placeholder shapes (not recommended).
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const outDir = join(process.cwd(), "public", "lottie");
mkdirSync(outDir, { recursive: true });

/** Minimal valid Lottie — soft pulse + accent ring (lightweight, no external deps). */
function pulseScene(name, color, accent) {
  return {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 90,
    w: 200,
    h: 200,
    nm: name,
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Ring",
        sr: 1,
        ks: {
          o: { a: 0, k: 55 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [100, 100, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [88, 88, 100] },
              { t: 45, s: [104, 104, 100] },
              { t: 90, s: [88, 88, 100] },
            ],
          },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [130, 130] } },
              { ty: "st", c: { a: 0, k: accent }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2 },
              { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
            ],
            nm: "Ring",
            np: 3,
            cix: 2,
            bm: 0,
          },
        ],
        ip: 0,
        op: 90,
        st: 0,
        bm: 0,
      },
      {
        ddd: 0,
        ind: 2,
        ty: 4,
        nm: "Core",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [100, 100, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [92, 92, 100] },
              { t: 45, s: [100, 100, 100] },
              { t: 90, s: [92, 92, 100] },
            ],
          },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [72, 72] } },
              { ty: "fl", c: { a: 0, k: color }, o: { a: 0, k: 100 }, r: 1 },
              { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
            ],
            nm: "Core",
            np: 3,
            cix: 2,
            bm: 0,
          },
        ],
        ip: 0,
        op: 90,
        st: 0,
        bm: 0,
      },
    ],
  };
}

/** One-shot scale-in for success moments. */
function popScene(name, color) {
  return {
    v: "5.7.4",
    fr: 30,
    ip: 0,
    op: 45,
    w: 200,
    h: 200,
    nm: name,
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Pop",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [100, 100, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [0, 0, 100] },
              { t: 20, s: [110, 110, 100] },
              { t: 35, s: [100, 100, 100] },
              { t: 45, s: [100, 100, 100] },
            ],
          },
        },
        ao: 0,
        shapes: [
          {
            ty: "gr",
            it: [
              { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [90, 90] } },
              { ty: "fl", c: { a: 0, k: color }, o: { a: 0, k: 100 }, r: 1 },
              { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
            ],
            nm: "Pop",
            np: 3,
            cix: 2,
            bm: 0,
          },
        ],
        ip: 0,
        op: 45,
        st: 0,
        bm: 0,
      },
    ],
  };
}

const scenes = {
  "home-wallet.json": pulseScene("homeWallet", [0.35, 0.55, 0.98, 1], [0.55, 0.72, 1, 1]),
  "empty-chart.json": pulseScene("emptyChart", [0.55, 0.45, 0.95, 1], [0.7, 0.6, 1, 1]),
  "empty-inbox.json": pulseScene("emptyInbox", [0.45, 0.65, 0.92, 1], [0.6, 0.8, 0.98, 1]),
  "all-caught-up.json": pulseScene("allCaughtUp", [0.35, 0.78, 0.55, 1], [0.5, 0.9, 0.65, 1]),
  "activity-quiet.json": pulseScene("activityQuiet", [0.5, 0.55, 0.62, 1], [0.65, 0.7, 0.78, 1]),
  "gentle-error.json": pulseScene("gentleError", [0.95, 0.55, 0.45, 1], [1, 0.65, 0.55, 1]),
  "success-check.json": popScene("successCheck", [0.3, 0.78, 0.5, 1]),
  "shopping-done.json": popScene("shoppingDone", [0.4, 0.65, 0.95, 1]),
};

for (const [file, data] of Object.entries(scenes)) {
  writeFileSync(join(outDir, file), JSON.stringify(data));
  console.log("wrote", file);
}
