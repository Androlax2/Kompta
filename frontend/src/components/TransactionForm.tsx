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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { formatAmountInput, parseAmountInput, today } from "@/lib/format";
import { AddTransaction } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";

interface TransactionFormProps {
  onAdded: () => void;
  activities?: main.ActivityWithStats[];
  fixedActivityId?: number;
}

function TransactionForm({
  onAdded,
  activities,
  fixedActivityId,
}: TransactionFormProps) {
  const [type, setType] = useState<"gain" | "depense">("gain");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [activityId, setActivityId] = useState("0");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = parseAmountInput(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Entre un montant en kamas supérieur à 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      await AddTransaction(
        new main.Transaction({
          id: 0,
          date,
          amount: type === "gain" ? parsed : -parsed,
          category,
          note: note.trim(),
          activityId: fixedActivityId ?? Number(activityId),
          createdAt: "",
        })
      );
      setAmount("");
      setNote("");
      onAdded();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter une transaction</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={type === "gain" ? "default" : "outline"}
              className={
                type === "gain"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : ""
              }
              onClick={() => setType("gain")}
            >
              Gain
            </Button>
            <Button
              type="button"
              variant={type === "depense" ? "default" : "outline"}
              className={
                type === "depense" ? "bg-red-600 hover:bg-red-700 text-white" : ""
              }
              onClick={() => setType("depense")}
            >
              Dépense
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Montant (kamas)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="numeric"
              placeholder="ex : 250 000"
              value={amount}
              onChange={(e) => setAmount(formatAmountInput(e.target.value))}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fixedActivityId === undefined && (
            <div className="space-y-2">
              <Label>Activité (optionnel)</Label>
              <Select value={activityId} onValueChange={setActivityId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Aucune</SelectItem>
                  {(activities ?? []).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optionnel)</Label>
            <Input
              id="note"
              placeholder="ex : vente de 100 blés"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ajout en cours..." : "Ajouter la transaction"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default TransactionForm;
