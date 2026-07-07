import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmountInput, parseAmountInput } from "@/lib/format";
import { AddItem } from "../../wailsjs/go/main/App";

interface NewItemFormProps {
  activityId: number;
  onAdded: () => void;
  onError: (message: string) => void;
}

function NewItemForm({ activityId, onAdded, onError }: NewItemFormProps) {
  const [name, setName] = useState("");
  const [startKamas, setStartKamas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseAmountInput(startKamas);
    if (!Number.isFinite(parsed)) {
      onError("Entre tes kamas actuels pour démarrer.");
      return;
    }
    setIsSubmitting(true);
    try {
      await AddItem(activityId, name, parsed);
      setName("");
      setStartKamas("");
      onAdded();
    } catch (err) {
      onError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={create}
      className="rounded-lg border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-[1fr_220px_auto] gap-3 items-end"
    >
      <div className="space-y-1.5">
        <Label htmlFor="item-name">Objet ou lot</Label>
        <Input
          id="item-name"
          placeholder="ex : Coiffe Moon +40 fo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="item-start">Kamas actuels</Label>
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
  );
}

export default NewItemForm;
