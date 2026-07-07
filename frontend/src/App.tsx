import { useCallback, useEffect, useMemo, useState } from "react";
import ActivityDetail from "@/components/ActivityDetail";
import ActivityList from "@/components/ActivityList";
import SummaryCards from "@/components/SummaryCards";
import ThemeToggle from "@/components/ThemeToggle";
import TransactionForm from "@/components/TransactionForm";
import TransactionTable from "@/components/TransactionTable";
import {
  GetSummary,
  ListActivities,
  ListTransactions,
} from "../wailsjs/go/main/App";
import { main } from "../wailsjs/go/models";

function App() {
  const [transactions, setTransactions] = useState<main.Transaction[]>([]);
  const [summary, setSummary] = useState<main.Summary | null>(null);
  const [activities, setActivities] = useState<main.ActivityWithStats[]>([]);
  const [activeActivityId, setActiveActivityId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [list, sum, acts] = await Promise.all([
        ListTransactions(),
        GetSummary(),
        ListActivities(),
      ]);
      setTransactions(list);
      setSummary(sum);
      setActivities(acts);
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Kompta
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Comptabilité Dofus</p>
            <ThemeToggle />
          </div>
        </header>

        {activeActivityId !== null ? (
          <ActivityDetail
            activityId={activeActivityId}
            onBack={() => {
              setActiveActivityId(null);
              refresh();
            }}
            onChanged={refresh}
          />
        ) : (
          <>
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400">
                {error}
              </div>
            )}

            <SummaryCards summary={summary} />

            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
              <div className="space-y-6">
                <TransactionForm onAdded={refresh} activities={activities} />
                <ActivityList
                  activities={activities}
                  onOpen={setActiveActivityId}
                />
              </div>
              <TransactionTable
                transactions={transactions}
                activityNames={activityNames}
                onActivityClick={setActiveActivityId}
                onChanged={refresh}
                onError={setError}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
