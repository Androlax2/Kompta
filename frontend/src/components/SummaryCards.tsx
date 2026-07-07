import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKamas } from "@/lib/format";
import { main } from "../../wailsjs/go/models";
import { Coins, TrendingDown, TrendingUp } from "lucide-react";

interface SummaryCardsProps {
  summary: main.Summary | null;
}

function SummaryCards({ summary }: SummaryCardsProps) {
  const balance = summary?.balance ?? 0;
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const count = summary?.count ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Solde
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-3xl font-bold ${
              balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatKamas(balance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {count} transaction{count > 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Gains totaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatKamas(totalIncome)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
            Dépenses totales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
            {formatKamas(totalExpenses)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SummaryCards;
