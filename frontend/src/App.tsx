import { useCallback, useEffect, useMemo, useState } from "react";
import ActivityView from "@/components/ActivityView";
import DashboardView from "@/components/DashboardView";
import ThemeToggle from "@/components/ThemeToggle";
import { formatKamas } from "@/lib/format";
import {
  GetSummary,
  ListActivities,
  ListItems,
  ListTransactions,
} from "../wailsjs/go/main/App";
import { main } from "../wailsjs/go/models";

const FIXED_ORDER = ["Forgemagie", "Métiers"];

function sortActivities(activities: main.ActivityWithStats[]) {
  const rank = (a: main.ActivityWithStats) => {
    const i = FIXED_ORDER.indexOf(a.name);
    return i === -1 ? FIXED_ORDER.length : i;
  };
  return [...activities].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function App() {
  const [transactions, setTransactions] = useState<main.Transaction[]>([]);
  const [summary, setSummary] = useState<main.Summary | null>(null);
  const [activities, setActivities] = useState<main.ActivityWithStats[]>([]);
  const [itemsByActivity, setItemsByActivity] = useState<
    Map<number, main.ItemWithStats[]>
  >(new Map());
  const [tab, setTab] = useState<"dashboard" | number>("dashboard");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [list, sum, acts] = await Promise.all([
        ListTransactions(),
        GetSummary(),
        ListActivities(),
      ]);
      const sorted = sortActivities(acts);
      const itemLists = await Promise.all(sorted.map((a) => ListItems(a.id)));
      setTransactions(list);
      setSummary(sum);
      setActivities(sorted);
      setItemsByActivity(new Map(sorted.map((a, i) => [a.id, itemLists[i]])));
      setError("");
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activityNames = useMemo(
    () => new Map(activities.map((a) => [a.id, a.name])),
    [activities]
  );

  const allItems = useMemo(
    () => activities.flatMap((a) => itemsByActivity.get(a.id) ?? []),
    [activities, itemsByActivity]
  );

  const openItems = useMemo(
    () => allItems.filter((i) => !i.done),
    [allItems]
  );

  const activeActivity =
    typeof tab === "number"
      ? activities.find((a) => a.id === tab)
      : undefined;

  const balance = summary?.balance ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-baseline gap-3">
              <h1 className="text-xl font-bold tracking-tight">Kompta</h1>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Comptabilité Dofus
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-semibold tabular-nums ${
                  balance >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatKamas(balance)}
              </span>
              <ThemeToggle />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            <TabButton
              active={tab === "dashboard"}
              onClick={() => setTab("dashboard")}
            >
              Tableau de bord
            </TabButton>
            {activities.map((a) => (
              <TabButton
                key={a.id}
                active={tab === a.id}
                onClick={() => setTab(a.id)}
              >
                {a.name}
              </TabButton>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400">
            {error}
          </div>
        )}

        {activeActivity ? (
          <ActivityView
            activity={activeActivity}
            items={itemsByActivity.get(activeActivity.id) ?? []}
            transactions={transactions.filter(
              (t) => t.activityId === activeActivity.id
            )}
            onDeleted={() => {
              setTab("dashboard");
              refresh();
            }}
            onChanged={refresh}
            onError={setError}
          />
        ) : (
          <DashboardView
            summary={summary}
            activities={activities}
            transactions={transactions}
            openItems={openItems}
            allItems={allItems}
            activityNames={activityNames}
            onOpenActivity={setTab}
            onChanged={refresh}
            onError={setError}
          />
        )}
      </main>
    </div>
  );
}

export default App;
