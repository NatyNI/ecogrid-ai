import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Battery,
  BatteryCharging,
  Brain,
  Cloud,
  CloudSun,
  Cpu,
  Gauge,
  Leaf,
  Plug,
  Sun,
  Thermometer,
  TrendingDown,
  Zap,
} from "lucide-react";
import { fetchDashboard } from "./api";
import type { DashboardResponse, Decision, HourlyDecision } from "./types";

const decisionColor: Record<Decision, string> = {
  battery: "var(--battery)",
  grid: "var(--grid)",
  "solar-direct": "var(--solar)",
  "charge-battery": "var(--accent)",
  "solar+battery": "var(--solar)",
  "solar+grid": "var(--solar)",
};

const decisionLabel: Record<Decision, string> = {
  battery: "Battery",
  grid: "Grid",
  "solar-direct": "Solar direct",
  "charge-battery": "Charge battery",
  "solar+battery": "Solar + Battery",
  "solar+grid": "Solar + Grid",
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  useEffect(() => {
    const timer = setInterval(() => setCurrentHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const dashboard = await fetchDashboard();
        if (!cancelled) setData(dashboard);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const decisions = data?.decisions ?? [];

  const totals = useMemo(() => {
    const cons = decisions.reduce((acc, item) => acc + item.predictedConsumption, 0);
    const solar = decisions.reduce((acc, item) => acc + item.predictedSolar, 0);
    const saved = decisions.reduce((acc, item) => acc + item.savings, 0);
    return {
      cons: cons.toFixed(1),
      solar: solar.toFixed(1),
      saved: saved.toFixed(1),
      savedPct: cons > 0 ? Math.round((saved / cons) * 100) : 0,
      co2: (saved * 0.4).toFixed(1),
    };
  }, [decisions]);

  const sunnyDay = parseFloat(totals.solar) > 12;
  const currentDecision = decisions[currentHour];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-border/40 backdrop-blur-xl sticky top-0 z-10 bg-background/60">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-eco flex items-center justify-center shadow-glow">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">EcoGrid AI</h1>
              <p className="text-xs text-muted-foreground font-mono">Python API + React dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <Pill icon={<Cpu className="w-3.5 h-3.5" />} label="Random Forest" value={data ? `${data.metrics.samples} obs` : "..."} />
            <Pill icon={<CloudSun className="w-3.5 h-3.5" />} label="Open-Meteo" value={data?.weather.city ?? "..."} />
            <Pill icon={<Gauge className="w-3.5 h-3.5" />} label="Live" value={`${currentHour}:00`} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        <section className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-card relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-gradient-eco opacity-10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary mb-3">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Current system decision · {currentHour}:00
              </div>
              {loading ? (
                <div className="h-24 flex items-center text-muted-foreground">
                  Training Random Forest on Python backend...
                </div>
              ) : currentDecision ? (
                <>
                  <h2 className="text-4xl md:text-5xl font-bold mb-2">
                    Use{" "}
                    <span className="bg-gradient-eco bg-clip-text text-transparent">
                      {decisionLabel[currentDecision.decision]}
                    </span>
                  </h2>
                  <p className="text-muted-foreground text-lg">{currentDecision.reason}</p>
                  <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-border/60">
                    <Metric label="Predicted consumption" value={`${currentDecision.predictedConsumption.toFixed(2)} kWh`} />
                    <Metric label="Solar production" value={`${currentDecision.predictedSolar.toFixed(2)} kWh`} />
                    <Metric label="Saved" value={`${currentDecision.savings.toFixed(2)} kWh`} accent />
                  </div>
                  <SourceBreakdown decision={currentDecision} />
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-6 shadow-card">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
              <Sun className="w-3.5 h-3.5" /> Today&apos;s weather
            </div>
            <div className={`text-3xl font-bold mb-1 ${sunnyDay ? "text-solar" : "text-grid"}`}>
              {sunnyDay ? "Sunny day" : "Cloudy day"}
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {sunnyDay
                ? "Battery will be used during consumption peaks."
                : "Battery is reserved for evening, grid prioritized during the day."}
            </p>
            <div className="space-y-3">
              {data?.weather.daily.slice(0, 1).map((item) => (
                <div key={item.date} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {item.cloudMean > 60 ? (
                      <Cloud className="w-4 h-4 text-grid" />
                    ) : (
                      <Sun className="w-4 h-4 text-solar" />
                    )}
                    <span className="font-mono text-muted-foreground">
                      {new Date(item.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{Math.round(item.cloudMean)}% clouds</span>
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      {Math.round(item.tMax)}°
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<Zap />} label="Predicted daily consumption" value={`${totals.cons} kWh`} tint="primary" />
          <KpiCard icon={<Sun />} label="Solar production" value={`${totals.solar} kWh`} tint="solar" />
          <KpiCard icon={<TrendingDown />} label="Grid energy avoided" value={`${totals.saved} kWh`} sub={`${totals.savedPct}% of total`} tint="accent" />
          <KpiCard icon={<Leaf />} label="CO₂ avoided" value={`${totals.co2} kg`} tint="primary" />
        </section>

        <section className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h3 className="text-xl font-bold">24h profile · Consumption vs Solar</h3>
              <p className="text-sm text-muted-foreground">Random Forest predictions powered by FastAPI</p>
            </div>
            <Legend />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={decisions} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="gSolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--solar)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--solar)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(h) => `${h}:00`} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} unit=" kW" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                  }}
                  formatter={(value: number) => `${value.toFixed(2)} kWh`}
                  labelFormatter={(h) => `Hour ${h}:00`}
                />
                <Area type="monotone" dataKey="predictedSolar" name="Solar" stroke="var(--solar)" fill="url(#gSolar)" strokeWidth={2} />
                <Area type="monotone" dataKey="predictedConsumption" name="Consumption" stroke="var(--primary)" fill="url(#gCons)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-2xl bg-card border border-border p-6 shadow-card">
            <h3 className="text-xl font-bold mb-1">Hourly energy source</h3>
            <p className="text-sm text-muted-foreground mb-6">Automated system decisions</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={decisions} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(h) => `${h}h`} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} unit=" kW" />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }}
                    formatter={(value: number, _name, payload) => [
                      `${value.toFixed(2)} kWh`,
                      decisionLabel[payload.payload.decision as Decision],
                    ]}
                    labelFormatter={(h) => `Hour ${h}:00`}
                  />
                  <Bar dataKey="predictedConsumption" radius={[6, 6, 0, 0]}>
                    {decisions.map((item, index) => (
                      <Cell key={item.hour} fill={decisionColor[item.decision]} opacity={index === currentHour ? 1 : 0.75} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-card">
            <h3 className="text-xl font-bold mb-1">Hourly weather</h3>
            <p className="text-sm text-muted-foreground mb-6">ML model inputs</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.weather.today ?? []} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(h) => `${h}h`} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="cloudCover" name="Clouds %" stroke="var(--grid)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="temperature" name="Temp °C" stroke="var(--solar)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold">AI decision log</h3>
            {data && (
              <span className="ml-auto text-xs font-mono text-muted-foreground">
                Consumption MAE: {data.metrics.consumptionMAE.toFixed(3)} kWh · Solar MAE: {data.metrics.solarMAE.toFixed(3)} kWh
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-auto pr-2">
            {decisions.map((item) => (
              <div
                key={item.hour}
                className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                  item.hour === currentHour
                    ? "border-primary/60 bg-primary/5 shadow-glow"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${decisionColor[item.decision]}25`, color: decisionColor[item.decision] }}
                >
                  <DecisionIcon decision={item.decision} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{String(item.hour).padStart(2, "0")}:00</span>
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: `${decisionColor[item.decision]}20`, color: decisionColor[item.decision] }}
                    >
                      {decisionLabel[item.decision]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border p-8 bg-card/40 backdrop-blur">
          <h3 className="text-xl font-bold mb-6 text-center">System architecture</h3>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-mono">
            <Node icon={<Gauge />}>Consumption sensors</Node>
            <Arrow />
            <Node icon={<CloudSun />}>Weather API</Node>
            <Arrow />
            <Node icon={<Brain />} highlight>FastAPI + scikit-learn</Node>
            <Arrow />
            <Node icon={<Zap />}>Optimal decision</Node>
            <Arrow />
            <Node icon={<Leaf />}>React dashboard</Node>
          </div>
        </section>

        {error && (
          <div className="text-sm text-destructive border border-destructive/40 rounded-xl p-4">
            {error}
          </div>
        )}

        <footer className="text-center text-xs text-muted-foreground font-mono py-6">
          EcoGrid AI · FastAPI Random Forest + React + Open-Meteo
        </footer>
      </main>
    </div>
  );
}

function Pill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 border border-border">
      <span className="text-primary">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tint: "primary" | "solar" | "accent";
}) {
  const colors = {
    primary: "text-primary",
    solar: "text-solar",
    accent: "text-accent",
  };
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
      <div className={`w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center mb-3 ${colors[tint]}`}>
        {icon}
      </div>
      <div className="text-xs text-muted-foreground uppercase font-mono tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex gap-4 text-xs font-mono">
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-solar" /> Solar</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary" /> Consumption</span>
    </div>
  );
}

function DecisionIcon({ decision }: { decision: Decision }) {
  if (decision === "battery") return <Battery className="w-5 h-5" />;
  if (decision === "charge-battery") return <BatteryCharging className="w-5 h-5" />;
  if (decision === "solar-direct" || decision === "solar+battery" || decision === "solar+grid") {
    return <Sun className="w-5 h-5" />;
  }
  return <Plug className="w-5 h-5" />;
}

function SourceBreakdown({ decision }: { decision: HourlyDecision }) {
  const total = decision.solarUsed + decision.batteryUsed + decision.gridUsed;
  if (total <= 0.01) return null;
  const pct = (value: number) => (total > 0 ? (value / total) * 100 : 0);
  const parts = [
    { label: "Solar", value: decision.solarUsed, color: "var(--solar)", icon: <Sun className="w-3.5 h-3.5" /> },
    { label: "Battery", value: decision.batteryUsed, color: "var(--battery)", icon: <Battery className="w-3.5 h-3.5" /> },
    { label: "Grid", value: decision.gridUsed, color: "var(--grid)", icon: <Plug className="w-3.5 h-3.5" /> },
  ].filter((part) => part.value > 0.01);

  return (
    <div className="mt-5 pt-5 border-t border-border/60">
      <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-3">
        Energy mix · {total.toFixed(2)} kWh
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary/60 mb-3">
        {parts.map((part) => (
          <div key={part.label} style={{ width: `${pct(part.value)}%`, background: part.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {parts.map((part) => (
          <div key={part.label} className="flex items-center gap-1.5" style={{ color: part.color }}>
            {part.icon}
            <span className="font-mono font-semibold">{part.value.toFixed(2)} kWh</span>
            <span className="text-muted-foreground text-xs">{part.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Node({ icon, children, highlight = false }: { icon: React.ReactNode; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
        highlight
          ? "bg-gradient-eco text-primary-foreground border-transparent shadow-glow"
          : "bg-secondary/60 border-border"
      }`}
    >
      <span className={highlight ? "" : "text-primary"}>{icon}</span>
      {children}
    </div>
  );
}

function Arrow() {
  return <span className="text-muted-foreground">→</span>;
}
