import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatSignedKamas } from "@/lib/format";
import { DeleteTransaction } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { Trash2 } from "lucide-react";

interface TransactionTableProps {
  transactions: main.Transaction[];
  onChanged: () => void;
  onError: (message: string) => void;
  activityNames?: Map<number, string>;
  hideActivityColumn?: boolean;
  onActivityClick?: (id: number) => void;
}

function TransactionTable({
  transactions,
  onChanged,
  onError,
  activityNames,
  hideActivityColumn,
  onActivityClick,
}: TransactionTableProps) {
  async function remove(id: number) {
    if (!window.confirm("Supprimer cette transaction ?")) return;
    try {
      await DeleteTransaction(id);
      onChanged();
    } catch (err) {
      onError(String(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucune transaction pour le moment.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                {!hideActivityColumn && <TableHead>Activité</TableHead>}
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(t.date)}
                  </TableCell>
                  <TableCell>{t.category}</TableCell>
                  {!hideActivityColumn && (
                    <TableCell>
                      {t.activityId !== 0 && activityNames?.has(t.activityId) ? (
                        onActivityClick ? (
                          <button
                            type="button"
                            onClick={() => onActivityClick(t.activityId)}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground max-w-40 truncate hover:text-foreground"
                          >
                            {activityNames.get(t.activityId)}
                          </button>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground max-w-40 truncate">
                            {activityNames.get(t.activityId)}
                          </span>
                        )
                      ) : null}
                    </TableCell>
                  )}
                  <TableCell
                    className={`text-right font-medium whitespace-nowrap ${
                      t.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatSignedKamas(t.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-48 truncate">
                    {t.note}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(t.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600 dark:hover:text-red-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default TransactionTable;
