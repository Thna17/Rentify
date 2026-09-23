export const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="p-6 text-center space-y-2">
    <div className="text-sm font-semibold text-foreground">{title}</div>
    <div className="text-xs text-muted-foreground">{description}</div>
  </div>
);
