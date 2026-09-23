import { Button } from "@rentify/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rentify/shared/ui/select";

export const FiltersBar = ({
  status,
  reminderType,
  onStatusChange,
  onReminderTypeChange,
  onReset,
}: {
  status?: string;
  reminderType?: string;
  onStatusChange: (value?: string) => void;
  onReminderTypeChange: (value?: string) => void;
  onReset: () => void;
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={status || "all"} onValueChange={(value) => onStatusChange(value === "all" ? undefined : value)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="sent">Sent</SelectItem>
          <SelectItem value="skipped">Skipped</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
        </SelectContent>
      </Select>

      <Select value={reminderType || "all"} onValueChange={(value) => onReminderTypeChange(value === "all" ? undefined : value)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Reminder type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="first">First</SelectItem>
          <SelectItem value="second">Second</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
};
