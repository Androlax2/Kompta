import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatAmountInput,
  formatKamas,
  formatSignedKamas,
  parseAmountInput,
} from "@/lib/format";
import {
  AddItem,
  AddSale,
  DeleteItem,
  FinishItem,
} from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import { Trash2 } from "lucide-react";

interface ItemRowProps {
  item: main.ItemWithStats;
  onChanged: () => void;
  onError: (message: string) => void;
}

function ItemRow({ item, onChanged, onError }: ItemRowProps) {
  const [mode, setMode] = useState<"finish" | "sale" | null>(null);
  const [amount, setAmount] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseAmountInput(amount);
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
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm truncate">{item.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs shrink-0 ${
            item.done
              ? "bg-muted text-muted-foreground"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
          }`}
        >
          {item.done ? "Terminé" : "En cours"}
        </span>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {!item.done && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMode(mode === "finish" ? null : "finish");
                setAmount("");
              }}
            >
              Terminer
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMode(mode === "sale" ? null : "sale");
              setAmount("");
            }}
          >
            + Vente
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={remove}
            aria-label="Supprimer l'objet"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600 dark:hover:text-red-400" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {!item.done && <span>Départ : {formatKamas(item.startKamas)}</span>}
        <span>
          Dépensé :{" "}
          <span className="text-red-600 dark:text-red-400">
            {formatKamas(item.spent)}
          </span>
        </span>
        <span>
          Ventes :{" "}
          <span className="text-emerald-600 dark:text-emerald-400">
            {formatKamas(item.sales)}
          </span>
        </span>
        <span>
          P&L :{" "}
          <span
            className={
              item.balance >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }
          >
            {formatSignedKamas(item.balance)}
          </span>
        </span>
      </div>

      {mode !== null && (
        <form onSubmit={submit} className="flex items-center gap-2">
          <Input
            type="text"
            inputMode="numeric"
            autoFocus
            placeholder={
              mode === "finish" ? "Kamas restants" : "Montant de la vente"
            }
            value={amount}
            onChange={(e) => setAmount(formatAmountInput(e.target.value))}
            className="h-8"
          />
          <Button type="submit" size="sm" disabled={amount === ""}>
            {mode === "finish" ? "Valider" : "Vendre"}
          </Button>
        </form>
      )}
    </div>
  );
}

interface ItemsPanelProps {
  activityId: number;
  items: main.ItemWithStats[];
  onChanged: () => void;
  onError: (message: string) => void;
}

function ItemsPanel({ activityId, items, onChanged, onError }: ItemsPanelProps) {
  const [name, setName] = useState("");
  const [startKamas, setStartKamas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseAmountInput(startKamas);
    if (!Number.isFinite(parsed)) {
      onError("Entre tes kamas actuels pour démarrer l'objet.");
      return;
    }
    setIsSubmitting(true);
    try {
      await AddItem(activityId, name, parsed);
      setName("");
      setStartKamas("");
      onChanged();
    } catch (err) {
      onError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Objets & lots</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-[1fr_220px_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label htmlFor="item-name">Objet ou lot</Label>
            <Input
              id="item-name"
              placeholder="ex : Coiffe Moon +40 fo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="item-start">Kamas actuels (départ)</Label>
            <Input
              id="item-start"
              type="text"
              inputMode="numeric"
              placeholder="ex : 3 200 000"
              value={startKamas}
              onChange={(e) => setStartKamas(formatAmountInput(e.target.value))}
              disabled={isSubmitting}
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim() || startKamas === ""}
          >
            Démarrer
          </Button>
        </form>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucun objet pour le moment. Entre tes kamas actuels et démarre ton
            premier craft !
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onChanged={onChanged}
                onError={onError}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ItemsPanel;
