import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatAmountInput,
  formatKamas,
  formatSignedKamas,
  parseAmountInput,
} from "@/lib/format";
import { AddSale, DeleteItem, FinishItem } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { Trash2 } from "lucide-react";

interface ItemCardProps {
  item: main.ItemWithStats;
  activityName?: string;
  onOpenActivity?: (id: number) => void;
  onChanged: () => void;
  onError: (message: string) => void;
}

function ItemCard({
  item,
  activityName,
  onOpenActivity,
  onChanged,
  onError,
}: ItemCardProps) {
  const [mode, setMode] = useState<"finish" | "sale" | null>(null);
  const [amount, setAmount] = useState("");

  const parsed = parseAmountInput(amount);

  function finishPreview(): string {
    if (!Number.isFinite(parsed)) return "";
    const diff = item.startKamas - parsed;
    if (diff > 0) return `→ Dépense de ${formatKamas(diff)}`;
    if (diff < 0) return `→ Gain de ${formatKamas(-diff)}`;
    return "→ Aucune dépense enregistrée";
  }

  function toggleMode(next: "finish" | "sale") {
    setMode(mode === next ? null : next);
    setAmount("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(parsed)) {
      onError("Entre un montant en kamas valide.");
      return;
    }
    try {
      if (mode === "finish") {
        await FinishItem(item.id, parsed);
      } else {
        await AddSale(item.id, parsed);
      }
      setMode(null);
      setAmount("");
      onChanged();
    } catch (err) {
      onError(String(err));
    }
  }

  async function remove() {
    if (
      !window.confirm(
        "Supprimer cet objet ? Ses transactions seront conservées mais détachées."
      )
    ) {
      return;
    }
    try {
      await DeleteItem(item.id);
      onChanged();
    } catch (err) {
      onError(String(err));
    }
  }

  return (
    <div className="group rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{item.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                item.done
                  ? "bg-muted text-muted-foreground"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
              }`}
            >
              {item.done ? "Terminé" : "En cours"}
            </span>
            {activityName &&
              (onOpenActivity ? (
                <button
                  type="button"
                  onClick={() => onOpenActivity(item.activityId)}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {activityName}
                </button>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {activityName}
                </span>
              ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={remove}
          aria-label="Supprimer l'objet"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
        >
          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600 dark:hover:text-red-400" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
        {!item.done && <span>Départ {formatKamas(item.startKamas)}</span>}
        {(item.done || item.spent > 0) && (
          <span>
            Dépensé{" "}
            <span className="text-red-600 dark:text-red-400">
              {formatKamas(item.spent)}
            </span>
          </span>
        )}
        {(item.done || item.sales > 0) && (
          <span>
            Ventes{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              {formatKamas(item.sales)}
            </span>
          </span>
        )}
        {item.done && (
          <span>
            P&L{" "}
            <span
              className={`font-medium ${
                item.balance >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatSignedKamas(item.balance)}
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!item.done && (
          <Button
            size="sm"
            variant={mode === "finish" ? "secondary" : "default"}
            onClick={() => toggleMode("finish")}
          >
            Terminer
          </Button>
        )}
        <Button
          size="sm"
          variant={mode === "sale" ? "secondary" : "outline"}
          onClick={() => toggleMode("sale")}
        >
          + Vente
        </Button>
      </div>

      {mode !== null && (
        <form onSubmit={submit} className="space-y-1">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder={
                mode === "finish"
                  ? "Kamas restants maintenant"
                  : "Montant de la vente"
              }
              value={amount}
              onChange={(e) => setAmount(formatAmountInput(e.target.value))}
              className="h-9"
            />
            <Button type="submit" size="sm" disabled={amount === ""}>
              {mode === "finish" ? "Valider" : "Vendre"}
            </Button>
          </div>
          {mode === "finish" && amount !== "" && (
            <p className="text-xs text-muted-foreground">{finishPreview()}</p>
          )}
        </form>
      )}
    </div>
  );
}

export default ItemCard;
