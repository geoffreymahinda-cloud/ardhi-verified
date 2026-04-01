import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Find verified land in Kenya";
  const price = searchParams.get("price") || "";
  const location = searchParams.get("location") || "";
  const score = searchParams.get("score") || "";
  const size = searchParams.get("size") || "";
  const type = searchParams.get("type") || "";

  const scoreNum = parseInt(score);
  const scoreColor = scoreNum >= 90 ? "#22c55e" : scoreNum >= 70 ? "#f59e0b" : scoreNum > 0 ? "#ef4444" : "#6b7280";
  const scoreLabel = scoreNum >= 90 ? "Safe" : scoreNum >= 70 ? "Needs Review" : scoreNum > 0 ? "High Risk" : "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1A1A2E",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontSize: "36px", fontWeight: 800, color: "#00A550" }}>Ardhi</span>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#00A550" }} />
          </div>
          {score && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "999px", padding: "8px 20px" }}>
              <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: scoreColor }} />
              <span style={{ color: scoreColor, fontSize: "20px", fontWeight: 700 }}>{score}/100</span>
              <span style={{ color: scoreColor, fontSize: "16px", fontWeight: 600 }}>{scoreLabel}</span>
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1 style={{ fontSize: "52px", fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: "16px" }}>
            {title}
          </h1>

          {location && (
            <p style={{ fontSize: "24px", color: "rgba(255,255,255,0.6)", marginBottom: "24px" }}>
              {location}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            {price && (
              <span style={{ fontSize: "32px", fontWeight: 700, color: "#00A550" }}>
                {price}
              </span>
            )}
            {size && (
              <span style={{ fontSize: "20px", color: "rgba(255,255,255,0.5)", borderLeft: "2px solid rgba(255,255,255,0.2)", paddingLeft: "24px" }}>
                {size}
              </span>
            )}
            {type && (
              <span style={{ fontSize: "20px", color: "rgba(255,255,255,0.5)", borderLeft: "2px solid rgba(255,255,255,0.2)", paddingLeft: "24px" }}>
                {type}
              </span>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "24px" }}>
          <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)" }}>
            ardhiverified.com — Kenya&apos;s Verified Land Marketplace
          </span>
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>
            Verify. Monitor. Secure.
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
