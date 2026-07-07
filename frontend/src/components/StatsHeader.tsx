import { ReactNode } from "react";
import { formatKamas, formatSignedKamas } from "@/lib/format";

interface Stats {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  count: number;
}

interface StatsHeaderProps {
  heroLabel: string;
  stats: Stats | null;
  heroSigned?: boolean;
  action?: ReactNode;
}

function StatsHeader({ heroLabel, stats, heroSigned, action }: StatsHeaderProps) {
  const balance = stats?.balance ?? 0;
  const totalIncome = stats?.totalIncome ?? 0;
  const totalExpenses = stats?.totalExpenses ?? 0;
  const count = stats?.count ?? 0;

  return (
    <section className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{heroLabel}</p>
        <p
          className={`text-4xl font-semibold tracking-tight ${
            balance >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {heroSigned ? formatSignedKamas(balance) : formatKamas(balance)}
        </p>
      </div>
      <div className="flex items-end gap-8">
        <div>
          <p className="text-xs text-muted-foreground">Gains</p>
          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            {formatKamas(totalIncome)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Dépenses</p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            {formatKamas(totalExpenses)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="text-lg font-semibold">{count}</p>
        </div>
        {action}
      </div>
    </section>
  );
}

export default StatsHeader;
