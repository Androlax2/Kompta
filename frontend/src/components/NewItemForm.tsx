import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ItemIcon from "@/components/ItemIcon";
import { formatAmountInput, parseAmountInput } from "@/lib/format";
import { AddItem, SearchDofusItems } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";

interface NewItemFormProps {
  activityId: number;
  onAdded: () => void;
  onError: (message: string) => void;
}

function NewItemForm({ activityId, onAdded, onError }: NewItemFormProps) {
  const [name, setName] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [startKamas, setStartKamas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<main.DofusItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const query = name.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await SearchDofusItems(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        // Offline or API down: autocomplete silently does nothing.
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  function pick(item: main.DofusItem) {
    skipNextSearch.current = true;
    setName(item.name);
    setImgUrl(item.imgUrl);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseAmountInput(startKamas);
    if (!Number.isFinite(parsed)) {
      onError("Entre tes kamas actuels pour démarrer.");
      return;
    }
    setIsSubmitting(true);
    try {
      await AddItem(activityId, name, parsed, imgUrl);
      setName("");
      setImgUrl("");
      setStartKamas("");
      setSuggestions([]);
      setShowSuggestions(false);
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
      <div className="space-y-1.5 relative">
        <Label htmlFor="item-name">Objet ou lot</Label>
        <div className="flex items-center gap-2">
          {imgUrl !== "" && <ItemIcon imgUrl={imgUrl} size={32} />}
          <Input
            id="item-name"
            placeholder="ex : Coiffe Moon +40 fo"
            value={name}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value);
              setImgUrl("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowSuggestions(false);
            }}
            onBlur={() => {
              // Delay so a click on a suggestion still registers.
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            disabled={isSubmitting}
          />
        </div>
        {showSuggestions && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-md overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={`${s.name}-${i}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                <ItemIcon imgUrl={s.imgUrl} size={24} />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  Niv. {s.level}
                </span>
              </button>
            ))}
          </div>
        )}
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
