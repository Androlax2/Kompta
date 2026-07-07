import { Button } from "@/components/ui/button";
import CraftRanking from "@/components/CraftRanking";
import ItemCard from "@/components/ItemCard";
import NewItemForm from "@/components/NewItemForm";
import StatsHeader from "@/components/StatsHeader";
import TransactionTable from "@/components/TransactionTable";
import { DeleteActivity } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { Trash2 } from "lucide-react";

const FIXED_ACTIVITIES = ["Forgemagie", "Métiers"];

interface ActivityViewProps {
  activity: main.ActivityWithStats;
  items: main.ItemWithStats[];
  transactions: main.Transaction[];
  onDeleted: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
}

function ActivityView({
  activity,
  items,
  transactions,
  onDeleted,
  onChanged,
  onError,
}: ActivityViewProps) {
  const openItems = items.filter((i) => !i.done);
  const doneItems = items.filter((i) => i.done);
  const isFixed = FIXED_ACTIVITIES.includes(activity.name);

  async function remove() {
    if (
      !window.confirm(
        "Supprimer cette activité ? Ses transactions seront conservées mais détachées."
      )
    ) {
      return;
    }
    try {
      await DeleteActivity(activity.id);
      onDeleted();
    } catch (err) {
      onError(String(err));
    }
  }

  return (
    <div className="space-y-8">
      <StatsHeader
        heroLabel={`P&L — ${activity.name}`}
        stats={activity}
        heroSigned
        action={
          isFixed ? undefined : (
            <Button
              variant="ghost"
              size="icon"
              onClick={remove}
              aria-label="Supprimer l'activité"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600 dark:hover:text-red-400" />
            </Button>
          )
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Nouveau craft
        </h2>
        <NewItemForm
          activityId={activity.id}
          onAdded={onChanged}
          onError={onError}
        />
      </section>

      {openItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            En cours ({openItems.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {openItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onChanged={onChanged}
                onError={onError}
              />
            ))}
          </div>
        </section>
      )}

      {doneItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Terminés ({doneItems.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {doneItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onChanged={onChanged}
                onError={onError}
              />
            ))}
          </div>
        </section>
      )}

      <CraftRanking items={items} onChanged={onChanged} onError={onError} />

      <TransactionTable
        transactions={transactions}
        hideActivityColumn
        onChanged={onChanged}
        onError={onError}
      />
    </div>
  );
}

export default ActivityView;
