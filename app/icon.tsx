import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          borderRadius: "8px",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          fill="none"
        >
          {/* Top Left Token Pill: Emerald */}
          <rect x="4.5" y="6" width="10.5" height="5.5" rx="2.75" fill="#10B981" />
          {/* Top Right Token Pill: Indigo */}
          <rect x="17" y="6" width="10.5" height="5.5" rx="2.75" fill="#6366F1" />
          {/* Center Token Resolver Node */}
          <circle cx="16" cy="16.25" r="2.75" fill="#38BDF8" />
          {/* Vertical Foundation Pillar */}
          <rect x="13.25" y="20.5" width="5.5" height="6" rx="2.75" fill="#10B981" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
