import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rentify/shared/ui/table";
import type { UsageBreakdownRow } from "../types";

const formatDate = (value: string) =>
  format(new Date(value), "MMM dd, yyyy");

export const UsageTable = ({ rows }: { rows: UsageBreakdownRow[] }) => (
  <div className="border border-border rounded-xl overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Count</TableHead>
          <TableHead>Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${row.date}-${row.eventType}-${index}`}>
            <TableCell>{formatDate(row.date)}</TableCell>
            <TableCell>{row.eventType}</TableCell>
            <TableCell>{row.count}</TableCell>
            <TableCell>${row.cost.toFixed(2)}</TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-sm text-muted-foreground">
              No usage events found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);
