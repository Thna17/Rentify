import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";

export const KpiCard = ({
  label,
  value,
  badge,
}: {
  label: string;
  value: string | number;
  badge?: string;
}) => {
  return (
    <Card className="border-border bg-background shadow-sm">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
};
