import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDate,
  formatDateShort,
  formatKamas,
  formatKamasCompact,
  formatMonth,
  formatSignedKamas,
} from "@/lib/format";
import { main } from "../../wailsjs/go/models";

interface Point {
  date: string;
  t: number; // ms epoch
  balance: number;
}

const HEIGHT = 220;
const MARGIN = { left: 56, right: 12, top: 12, bottom: 24 };

function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [min];
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (count * step) / span;
  const factor = err <= 0.15 ? 10 : err <= 0.35 ? 5 : err <= 0.75 ? 2 : 1;
  const niceStep = step * factor;
  const start = Math.ceil(min / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let v = start; v <= max; v += niceStep) ticks.push(v);
  return ticks;
}

interface BalanceChartProps {
  transactions: main.Transaction[];
}

export function BalanceChart({ transactions }: BalanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<Point | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const points = useMemo<Point[]>(() => {
    const byDay = new Map<string, number>();
    for (const t of transactions) {
      byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);
    }
    const days = [...byDay.keys()].sort();
    let running = 0;
    return days.map((date) => {
      running += byDay.get(date) ?? 0;
      return { date, t: new Date(`${date}T00:00:00`).getTime(), balance: running };
    });
  }, [transactions]);

  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { x, y, yTicks, minBalance } = useMemo(() => {
    let minT = points.length ? points[0].t : 0;
    let maxT = points.length ? points[points.length - 1].t : 1;
    if (minT === maxT) {
      minT -= 43200000;
      maxT += 43200000;
    }
    const balances = points.map((p) => p.balance);
    const minB = Math.min(0, ...balances);
    const maxB = Math.max(0, ...balances);
    const pad = (maxB - minB || 1) * 0.05;
    const y0 = minB - (minB < 0 ? pad : 0);
    const y1 = maxB + pad;
    return {
      x: (t: number) => MARGIN.left + ((t - minT) / (maxT - minT)) * plotW,
      y: (b: number) => MARGIN.top + plotH - ((b - y0) / (y1 - y0)) * plotH,
      yTicks: niceTicks(y0, y1, 4),
      minBalance: minB,
    };
  }, [points, plotW, plotH]);

  function onMouseMove(e: React.MouseEvent<SVGRectElement>) {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left + MARGIN.left;
    let nearest = points[0];
    let best = Infinity;
    for (const p of points) {
      const d = Math.abs(x(p.t) - px);
      if (d < best) {
        best = d;
        nearest = p;
      }
    }
    setHover(nearest);
  }

  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Évolution du solde</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-12 text-center">
            Pas encore de données.
          </p>
        </CardContent>
      </Card>
    );
  }

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t)},${y(p.balance)}`)
    .join("");
  const areaPath =
    linePath +
    `L${x(points[points.length - 1].t)},${y(0)}L${x(points[0].t)},${y(0)}Z`;

  const xTickPoints =
    points.length <= 4
      ? points
      : [
          points[0],
          points[Math.floor(points.length / 3)],
          points[Math.floor((2 * points.length) / 3)],
          points[points.length - 1],
        ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution du solde</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="relative w-full">
          {width > 0 && (
            <svg width={width} height={HEIGHT} className="block">
              {/* grid + y labels */}
              {yTicks.map((v) => (
                <g key={v}>
                  <line
                    x1={MARGIN.left}
                    x2={width - MARGIN.right}
                    y1={y(v)}
                    y2={y(v)}
                    stroke="currentColor"
                    strokeWidth={1}
                    className="text-border"
                  />
                  <text
                    x={MARGIN.left - 8}
                    y={y(v)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-xs fill-current text-muted-foreground tabular-nums"
                  >
                    {formatKamasCompact(v)}
                  </text>
                </g>
              ))}

              {/* emphasized zero line when balance goes negative */}
              {minBalance < 0 && (
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(0)}
                  y2={y(0)}
                  stroke="currentColor"
                  strokeWidth={1}
                  className="text-muted-foreground"
                />
              )}

              {/* area + line */}
              <g className="text-emerald-600 dark:text-emerald-400">
                <path d={areaPath} fill="currentColor" fillOpacity={0.08} />
                <path
                  d={linePath}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>

              {/* x labels */}
              {xTickPoints.map((p, i) => (
                <text
                  key={`${p.date}-${i}`}
                  x={x(p.t)}
                  y={HEIGHT - 6}
                  textAnchor={
                    i === 0
                      ? "start"
                      : i === xTickPoints.length - 1
                        ? "end"
                        : "middle"
                  }
                  className="text-xs fill-current text-muted-foreground"
                >
                  {formatDateShort(p.date)}
                </text>
              ))}

              {/* hover crosshair */}
              {hover && (
                <g>
                  <line
                    x1={x(hover.t)}
                    x2={x(hover.t)}
                    y1={MARGIN.top}
                    y2={MARGIN.top + plotH}
                    stroke="currentColor"
                    strokeWidth={1}
                    className="text-border"
                  />
                  <circle
                    cx={x(hover.t)}
                    cy={y(hover.balance)}
                    r={3.5}
                    fill="currentColor"
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                </g>
              )}

              {/* hover capture */}
              <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={plotW}
                height={plotH}
                fill="transparent"
                onMouseMove={onMouseMove}
                onMouseLeave={() => setHover(null)}
              />
            </svg>
          )}

          {hover && width > 0 && (
            <div
              className="absolute pointer-events-none rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
              style={{
                left:
                  x(hover.t) + (x(hover.t) > width - 130 ? -8 : 8),
                top: MARGIN.top,
                transform:
                  x(hover.t) > width - 130 ? "translateX(-100%)" : undefined,
              }}
            >
              <p className="text-muted-foreground">{formatDate(hover.date)}</p>
              <p
                className={`font-medium tabular-nums ${
                  hover.balance >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatKamas(hover.balance)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MonthlyBreakdownProps {
  transactions: main.Transaction[];
}

export function MonthlyBreakdown({ transactions }: MonthlyBreakdownProps) {
  const months = useMemo(() => {
    const byMonth = new Map<string, { income: number; expenses: number }>();
    for (const t of transactions) {
      const key = t.date.slice(0, 7);
      const m = byMonth.get(key) ?? { income: 0, expenses: 0 };
      if (t.amount > 0) m.income += t.amount;
      else m.expenses += -t.amount;
      byMonth.set(key, m);
    }
    return [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6);
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Par mois</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {months.map(([month, m]) => (
            <div
              key={month}
              className="flex items-baseline justify-between gap-3 text-sm tabular-nums"
            >
              <span className="text-muted-foreground w-20 shrink-0">
                {formatMonth(month)}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {formatKamasCompact(m.income)}
              </span>
              <span className="text-xs text-red-600 dark:text-red-400">
                {formatKamasCompact(m.expenses)}
              </span>
              <span
                className={`font-semibold ${
                  m.income - m.expenses >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatSignedKamas(m.income - m.expenses)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
