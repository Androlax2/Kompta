import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatSignedKamas } from "@/lib/format";
import { main } from "../../wailsjs/go/models";

interface ActivityListProps {
  activities: main.ActivityWithStats[];
  onOpen: (id: number) => void;
}

function ActivityList({ activities, onOpen }: ActivityListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activités</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {activities.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onOpen(a.id)}
              className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-muted/50"
            >
              <span className="truncate text-sm font-medium">{a.name}</span>
              <span className="flex flex-col items-end shrink-0">
                <span
                  className={`text-sm font-medium ${
                    a.balance >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatSignedKamas(a.balance)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {a.count} tx
                </span>
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ActivityList;
