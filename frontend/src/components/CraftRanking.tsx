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
  formatAmountInput,
  formatSignedKamas,
  parseAmountInput,
} from "@/lib/format";
import { CraftGroup, groupCrafts } from "@/lib/profitability";
import { AddItem } from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";
import ItemIcon from "@/components/ItemIcon";

interface CraftRankingProps {
  items: main.ItemWithStats[];
  activityNames?: Map<number, string>;
  onOpenActivity?: (id: number) => void;
  limit?: number;
  onChanged: () => void;
  onError: (message: string) => void;
}

function CraftRanking({
  items,
  activityNames,
  onOpenActivity,
  limit,
  onChanged,
  onError,
}: CraftRankingProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const groups = useMemo(() => groupCrafts(items), [items]);
  const shown = limit !== undefined ? groups.slice(0, limit) : groups;

  if (groups.length === 0) return null;

  async function restart(group: CraftGroup, e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseAmountInput(amount);
    if (!Number.isFinite(parsed)) {
      onError("Entre tes kamas actuels pour recommencer.");
      return;
    }
    try {
      await AddItem(group.activityId, group.name, parsed, group.imgUrl);
      setExpandedKey(null);
      setAmount("");
      onChanged();
    } catch (err) {
      onError(String(err));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between">
        <CardTitle>Rentabilité</CardTitle>
        {limit !== undefined && groups.length > limit && (
          <span className="text-xs text-muted-foreground">
            Top {limit} sur {groups.length}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {shown.map((g) => (
            <div key={g.key} className="rounded-md px-2 py-1.5 hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <ItemIcon imgUrl={g.imgUrl} size={24} />
                <span className="truncate text-sm font-medium">{g.name}</span>
                {g.runs > 1 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    ×{g.runs}
                  </span>
                )}
                {activityNames?.has(g.activityId) &&
                  (onOpenActivity ? (
                    <button
                      type="button"
                      onClick={() => onOpenActivity(g.activityId)}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {activityNames.get(g.activityId)}
                    </button>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground shrink-0">
                      {activityNames.get(g.activityId)}
                    </span>
                  ))}
                {g.hasOpenRun && (
                  <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 px-2 py-0.5 text-xs shrink-0">
                    En cours
                  </span>
                )}
                <span className="ml-auto flex items-center gap-3 shrink-0 tabular-nums">
                  <span
                    className={`text-sm font-medium ${
                      g.totalBalance >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatSignedKamas(g.totalBalance)}
                  </span>
                  <span className="text-xs text-muted-foreground w-14 text-right">
                    {g.returnPct === null
                      ? "—"
                      : `${g.returnPct >= 0 ? "+" : "−"}${Math.round(
                          Math.abs(g.returnPct) * 100
                        )} %`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setExpandedKey(expandedKey === g.key ? null : g.key);
                      setAmount("");
                    }}
                  >
                    Recommencer
                  </Button>
                </span>
              </div>
              {expandedKey === g.key && (
                <form
                  onSubmit={(e) => restart(g, e)}
                  className="flex items-center gap-2 mt-2"
                >
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    placeholder="Kamas actuels"
                    value={amount}
                    onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                    className="h-8"
                  />
                  <Button type="submit" size="sm" disabled={amount === ""}>
                    Démarrer
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default CraftRanking;
