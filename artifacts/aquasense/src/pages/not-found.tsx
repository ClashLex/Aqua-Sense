import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: "var(--app-bg)" }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl border p-8"
        style={{
          background:   "var(--app-surface)",
          borderColor:  "var(--app-border)",
          boxShadow:    "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-7 w-7 text-[#dc2626] shrink-0" />
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--app-text-1)" }}
          >
            404 — Page Not Found
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--app-text-2)" }}>
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}
