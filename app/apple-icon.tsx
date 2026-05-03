import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%)",
          color: "#fff",
          fontSize: 58,
          fontWeight: 700,
          letterSpacing: -1,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        SF
      </div>
    ),
    {
      ...size,
    },
  );
}
