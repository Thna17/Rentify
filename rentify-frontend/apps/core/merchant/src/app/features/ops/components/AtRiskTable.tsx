import { format } from "date-fns";
import { Badge } from "@rentify/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@rentify/shared/ui/table";
import type { AtRiskInvoice } from "../types";

const formatDate = (value?: string | null) =>
  value ? format(new Date(value), "MMM dd, yyyy") : "—";

export const AtRiskTable = ({
  title,
  rows,
}: {
  title: string;
  rows: AtRiskInvoice[];
}) => {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Last Reminder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {row.invoiceNumber || row.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  {row.totalAmount ? `$${row.totalAmount}` : "—"}
                </TableCell>
                <TableCell>{formatDate(row.dueDate)}</TableCell>
                <TableCell className="space-y-1">
                  {row.lastReminder ? (
                    <>
                      <div className="text-xs text-muted-foreground">
                        {row.lastReminder.reminderType} •{" "}
                        {row.lastReminder.status}
                      </div>
                      {row.lastReminder.sentAt && (
                        <Badge variant="secondary">
                          {formatDate(row.lastReminder.sentAt)}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">No reminder</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
