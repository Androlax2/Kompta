import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatAmountInput,
  formatDate,
  formatSignedKamas,
  parseAmountInput,
} from "@/lib/format";
import {
  DeleteTransaction,
  UpdateTransaction,
} from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { Check, Pencil, Trash2, X } from "lucide-react";

interface Draft {
  date: string;
  category: string;
  amount: string;
  isGain: boolean;
  note: string;
}

interface TransactionTableProps {
  transactions: main.Transaction[];
  onChanged: () => void;
  onError: (message: string) => void;
  activityNames?: Map<number, string>;
  hideActivityColumn?: boolean;
  onActivityClick?: (id: number) => void;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function TransactionTable({
  transactions,
  onChanged,
  onError,
  activityNames,
  hideActivityColumn,
  onActivityClick,
}: TransactionTableProps) {
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({
    date: "",
    category: "",
    amount: "",
    isGain: true,
    note: "",
  });

  const categories = useMemo(
    () => [...new Set(transactions.map((t) => t.category))].sort(),
    [transactions]
  );

  const filtered = useMemo(() => {
    let list = transactions;
    if (filterCategory !== "all") {
      list = list.filter((t) => t.category === filterCategory);
    }
    if (filterPeriod !== "all") {
      const cutoff = isoDaysAgo(Number(filterPeriod));
      list = list.filter((t) => t.date >= cutoff);
    }
    const q = search.trim().toLowerCase();
    if (q !== "") {
      list = list.filter(
        (t) =>
          t.note.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, filterCategory, filterPeriod, search]);

  const hasFilter =
    filterCategory !== "all" || filterPeriod !== "all" || search.trim() !== "";

  function startEdit(t: main.Transaction) {
    setEditingId(t.id);
    setDraft({
      date: t.date,
      category: t.category,
      amount: formatAmountInput(String(Math.abs(t.amount))),
      isGain: t.amount > 0,
      note: t.note,
    });
  }

  async function saveEdit(t: main.Transaction) {
    const parsed = parseAmountInput(draft.amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onError("Entre un montant en kamas supérieur à 0.");
      return;
    }
    try {
      await UpdateTransaction(
        new main.Transaction({
          ...t,
          date: draft.date,
          amount: (draft.isGain ? 1 : -1) * parsed,
          category: draft.category,
          note: draft.note.trim(),
        })
      );
      setEditingId(null);
      onChanged();
    } catch (err) {
      onError(String(err));
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Supprimer cette transaction ?")) return;
    try {
      await DeleteTransaction(id);
      onChanged();
    } catch (err) {
      onError(String(err));
    }
  }

  function editKeyDown(e: React.KeyboardEvent, t: main.Transaction) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(t);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-baseline justify-between">
          <CardTitle>Historique</CardTitle>
          {transactions.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {hasFilter
                ? `${filtered.length} / ${transactions.length} transactions`
                : `${transactions.length} transaction${
                    transactions.length > 1 ? "s" : ""
                  }`}
            </span>
          )}
        </div>
        {transactions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout</SelectItem>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-44 text-xs"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucune transaction pour le moment.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucune transaction ne correspond aux filtres.
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
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) =>
                t.id === editingId ? (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Input
                        type="date"
                        value={draft.date}
                        onChange={(e) =>
                          setDraft({ ...draft, date: e.target.value })
                        }
                        onKeyDown={(e) => editKeyDown(e, t)}
                        className="h-8 w-36"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={draft.category}
                        onValueChange={(v) =>
                          setDraft({ ...draft, category: v })
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(categories.includes(draft.category)
                            ? categories
                            : [draft.category, ...categories]
                          ).map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {!hideActivityColumn && (
                      <TableCell>
                        {t.activityId !== 0 &&
                        activityNames?.has(t.activityId) ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {activityNames.get(t.activityId)}
                          </span>
                        ) : null}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`h-8 px-2 text-xs ${
                            draft.isGain
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                          onClick={() =>
                            setDraft({ ...draft, isGain: !draft.isGain })
                          }
                        >
                          {draft.isGain ? "Gain" : "Dépense"}
                        </Button>
                        <Input
                          inputMode="numeric"
                          value={draft.amount}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              amount: formatAmountInput(e.target.value),
                            })
                          }
                          onKeyDown={(e) => editKeyDown(e, t)}
                          className="h-8 w-28 text-right"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={draft.note}
                        onChange={(e) =>
                          setDraft({ ...draft, note: e.target.value })
                        }
                        onKeyDown={(e) => editKeyDown(e, t)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => saveEdit(t)}
                          aria-label="Enregistrer"
                        >
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingId(null)}
                          aria-label="Annuler"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={t.id} className="group">
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(t.date)}
                    </TableCell>
                    <TableCell>{t.category}</TableCell>
                    {!hideActivityColumn && (
                      <TableCell>
                        {t.activityId !== 0 &&
                        activityNames?.has(t.activityId) ? (
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
                      className={`text-right font-medium whitespace-nowrap tabular-nums ${
                        t.amount >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatSignedKamas(t.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-48 truncate">
                      {t.note}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(t)}
                          aria-label="Modifier"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(t.id)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600 dark:hover:text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default TransactionTable;
