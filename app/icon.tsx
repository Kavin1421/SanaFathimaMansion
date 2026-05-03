import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #6366f1 0%, #4f46e5 45%, #7c3aed 100%)",
          color: "#fff",
          fontSize: 168,
          fontWeight: 700,
          letterSpacing: -4,
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
