import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ItemsPanel from "@/components/ItemsPanel";
import SummaryCards from "@/components/SummaryCards";
import TransactionForm from "@/components/TransactionForm";
import TransactionTable from "@/components/TransactionTable";
import {
  DeleteActivity,
  GetActivity,
  ListItems,
  ListTransactionsByActivity,
} from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { ArrowLeft, Trash2 } from "lucide-react";

const FIXED_ACTIVITIES = ["Forgemagie", "Métiers"];

interface ActivityDetailProps {
  activityId: number;
  onBack: () => void;
  onChanged: () => void;
}

function ActivityDetail({ activityId, onBack, onChanged }: ActivityDetailProps) {
  const [activity, setActivity] = useState<main.ActivityWithStats | null>(null);
  const [transactions, setTransactions] = useState<main.Transaction[]>([]);
  const [items, setItems] = useState<main.ItemWithStats[]>([]);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const [a, list, its] = await Promise.all([
        GetActivity(activityId),
        ListTransactionsByActivity(activityId),
        ListItems(activityId),
      ]);
      setActivity(a);
      setTransactions(list);
      setItems(its);
      setError("");
    } catch (err) {
      setError(String(err));
    }
  }, [activityId]);

  useEffect(() => {
    reload();
  }, [reload]);

  function refreshAll() {
    reload();
    onChanged();
  }

  async function remove() {
    if (
      !window.confirm(
        "Supprimer cette activité ? Ses transactions seront conservées mais détachées."
      )
    ) {
      return;
    }
    try {
      await DeleteActivity(activityId);
      onChanged();
      onBack();
    } catch (err) {
      setError(String(err));
    }
  }

  const isFixed = activity !== null && FIXED_ACTIVITIES.includes(activity.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <h2 className="text-2xl font-bold tracking-tight text-foreground truncate">
          {activity?.name ?? "…"}
        </h2>
        {activity !== null && !isFixed && (
          <div className="ml-auto">
            <Button
              variant="outline"
              className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50"
              onClick={remove}
            >
              <Trash2 className="w-4 h-4" />
              Supprimer l'activité
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400">
          {error}
        </div>
      )}

      <SummaryCards summary={activity} />

      <ItemsPanel
        activityId={activityId}
        items={items}
        onChanged={refreshAll}
        onError={setError}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        <TransactionForm fixedActivityId={activityId} onAdded={refreshAll} />
        <TransactionTable
          transactions={transactions}
          hideActivityColumn
          onChanged={refreshAll}
          onError={setError}
        />
      </div>
    </div>
  );
}

export default ActivityDetail;
