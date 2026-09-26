import { Users } from 'lucide-react';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { useCustomers } from '../../hooks/useCustomers';

const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

export const Customers = () => {
  const { customers, isLoading } = useCustomers();

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Everyone who has ordered from you, in one place.
          </p>
        </div>

        <Card className="border border-border/70 shadow-none">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                <Users className="h-8 w-8 opacity-40" />
                <p className="text-sm">No customers yet — they'll show up here after your first order.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-muted-foreground border-b border-border/60">
                      <th className="px-6 py-3 font-medium">Customer</th>
                      <th className="px-6 py-3 font-medium">Contact</th>
                      <th className="px-6 py-3 font-medium text-right">Orders</th>
                      <th className="px-6 py-3 font-medium text-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.key} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                              {initials(c.name)}
                            </div>
                            <span className="font-medium text-foreground">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-muted-foreground">
                          {c.email || c.phone || '—'}
                        </td>
                        <td className="px-6 py-3.5 text-right text-foreground">{c.orderCount}</td>
                        <td className="px-6 py-3.5 text-right font-medium text-foreground">
                          ${c.totalSpent.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Customers;
