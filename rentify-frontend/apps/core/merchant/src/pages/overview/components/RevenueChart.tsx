import React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@rentify/shared/ui/chart";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

export interface TrendItem {
  date: string;
  revenue: number;
  orders: number;
}

export interface RevenueChartProps {
  data?: TrendItem[];
  dateRange?: { start?: string; end?: string };
  isLoading?: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data = [], isLoading }) => {
  if (isLoading) {
    return <Skeleton className="w-full h-[220px] rounded-xl sm:h-[300px]" />;
  }

  // Transform data for the chart
  const chartData = data.map((item) => ({
    date: item.date,
    revenue: parseFloat(String(item.revenue)) || 0,
    orders: item.orders || 0,
  }));

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "oklch(var(--primary))",
    },
    orders: {
      label: "Orders",
      color: "oklch(var(--secondary))",
    },
  };

  const hasSales = chartData.some((item) => item.revenue > 0 || item.orders > 0);

  if (!hasSales) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl bg-muted/40 px-4 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No sales in this period</p>
        <p className="text-xs text-muted-foreground">Your sales trend appears here after your first order.</p>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full sm:h-[300px]">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(var(--primary))" stopOpacity={0.25} />
            <stop offset="95%" stopColor="oklch(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="oklch(var(--border))" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `$${value}`}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                return new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
          }
        />
        <Area
          dataKey="revenue"
          type="monotone"
          fill="url(#fillRevenue)"
          fillOpacity={0.4}
          stroke="oklch(var(--primary))"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
};
