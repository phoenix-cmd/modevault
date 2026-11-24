import { ImageResponse } from "next/og"

export const alt = "MODELVAULT — Software development. Orchestrated."
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#151b1a",
          color: "#f0ede6",
          fontFamily: "sans-serif",
          borderTop: "10px solid #3c7cff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              backgroundColor: "#3c7cff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "24px",
              color: "#0b1010",
            }}
          >
            M
          </div>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            MODELVAULT
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              maxWidth: "960px",
            }}
          >
            Software development. Orchestrated.
          </div>
          <div
            style={{
              fontSize: "28px",
              lineHeight: 1.4,
              color: "#a7b1af",
              maxWidth: "880px",
            }}
          >
            Coordinate coding agents, verify diffs before merge, build DAG pipelines, and track AI spend in one environment.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #2b3533",
            paddingTop: "24px",
            fontSize: "18px",
            letterSpacing: "0.1em",
            color: "#7f8c89",
          }}
        >
          <span>MULTI-AGENT ORCHESTRATION // VERIFICATION // BILLING LEDGER</span>
          <span style={{ color: "#3c7cff" }}>modelvault.dev</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
