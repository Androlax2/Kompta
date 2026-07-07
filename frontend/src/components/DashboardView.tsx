import { Button } from "@/components/ui/button";
import { BalanceChart, MonthlyBreakdown } from "@/components/BalanceChart";
import CraftRanking from "@/components/CraftRanking";
import ItemCard from "@/components/ItemCard";
import StatsHeader from "@/components/StatsHeader";
import TransactionTable from "@/components/TransactionTable";
import { main } from "../../wailsjs/go/models";

interface DashboardViewProps {
  summary: main.Summary | null;
  activities: main.ActivityWithStats[];
  transactions: main.Transaction[];
  openItems: main.ItemWithStats[];
  allItems: main.ItemWithStats[];
  activityNames: Map<number, string>;
  onOpenActivity: (id: number) => void;
  onChanged: () => void;
  onError: (message: string) => void;
}

function DashboardView({
  summary,
  activities,
  transactions,
  openItems,
  allItems,
  activityNames,
  onOpenActivity,
  onChanged,
  onError,
}: DashboardViewProps) {
  return (
    <div className="space-y-8">
      <StatsHeader heroLabel="Solde total" stats={summary} />

      {transactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 items-start">
          <BalanceChart transactions={transactions} />
          <MonthlyBreakdown transactions={transactions} />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          En cours
        </h2>
        {openItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Aucun craft en cours. Note tes kamas et démarre un objet !
            </p>
            <div className="flex justify-center gap-2">
              {activities.map((a) => (
                <Button
                  key={a.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenActivity(a.id)}
                >
                  {a.name}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {openItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                activityName={activityNames.get(item.activityId)}
                onOpenActivity={onOpenActivity}
                onChanged={onChanged}
                onError={onError}
              />
            ))}
          </div>
        )}
      </section>

      <CraftRanking
        items={allItems}
        activityNames={activityNames}
        onOpenActivity={onOpenActivity}
        limit={5}
        onChanged={onChanged}
        onError={onError}
      />

      <TransactionTable
        transactions={transactions}
        activityNames={activityNames}
        onActivityClick={onOpenActivity}
        onChanged={onChanged}
        onError={onError}
      />
    </div>
  );
}

export default DashboardView;
