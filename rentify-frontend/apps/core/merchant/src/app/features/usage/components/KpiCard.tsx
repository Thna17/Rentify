import { Card, CardContent } from "@rentify/shared/ui/card";

export const KpiCard = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <Card className="border-border bg-background shadow-sm">
    <CardContent className="p-4 space-y-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
    </CardContent>
  </Card>
);
