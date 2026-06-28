import { AppShell } from "@/components/app-shell";

export default function Home() {
  return (
    <AppShell>
      {/* Placeholder — substituído na Task 2/3 quando RecommendationProvider for adicionado */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4 px-4"
        style={{ minHeight: 320 }}
      >
        <p
          style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 22,
            color: "var(--dim)",
            letterSpacing: "-0.01em",
          }}
        >
          Conecte um save
        </p>
        <p
          style={{
            fontSize: 14,
            color: "var(--dim)",
            opacity: 0.7,
          }}
        >
          O Overview aparecerá aqui após a Task 2.
        </p>
      </div>
    </AppShell>
  );
}
