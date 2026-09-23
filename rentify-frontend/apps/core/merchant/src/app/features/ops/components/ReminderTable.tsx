import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rentify/shared/ui/table";
import { Badge } from "@rentify/shared/ui/badge";
import type { ReminderLog } from "../types";

const formatDateTime = (value?: string | null) =>
  value ? format(new Date(value), "MMM dd, yyyy HH:mm") : "—";

export const ReminderTable = ({ rows }: { rows: ReminderLog[] }) => {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Sent At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                {row.invoiceId.slice(0, 8)}
              </TableCell>
              <TableCell>{row.reminderType}</TableCell>
              <TableCell>
                <Badge variant="secondary">{row.status}</Badge>
              </TableCell>
              <TableCell>{row.channel}</TableCell>
              <TableCell>{formatDateTime(row.sentAt)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">
                No reminders found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
