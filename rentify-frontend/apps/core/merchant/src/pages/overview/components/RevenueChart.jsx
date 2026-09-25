import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rentify/shared/ui/card";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@rentify/shared/ui/toggle-group";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@rentify/shared/ui/chart";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Line } from "recharts"

export const RevenueChart = ({ data, dateRange, isLoading }) => {
  const [timeRange, setTimeRange] = useState('7d');
  
  if (isLoading) {
    return (
      <Card className="h-full gap-4 py-6 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Sales</CardTitle>
          <CardDescription>Loading revenue data</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[320px] rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // Transform data for the chart
  const chartData = data.map(item => ({
    date: item.date,
    revenue: parseFloat(item.revenue) || 0,
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

  return (
    <Card className="h-full gap-4 py-6 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Sales</CardTitle>
          <CardDescription>
            {dateRange && (
              <span>
                {format(new Date(dateRange.start), 'MMM dd')} - {format(new Date(dateRange.end), 'MMM dd')}
              </span>
            )}
          </CardDescription>
        </div>
        <ToggleGroup
          type="single"
          value={timeRange}
          onValueChange={setTimeRange}
          size="sm"
          className="rounded-xl bg-muted p-0.5"
        >
          <ToggleGroupItem value="7d" className="rounded-lg px-3 text-xs data-[state=on]:bg-card data-[state=on]:shadow-sm">7D</ToggleGroupItem>
          <ToggleGroupItem value="30d" className="rounded-lg px-3 text-xs data-[state=on]:bg-card data-[state=on]:shadow-sm">30D</ToggleGroupItem>
          <ToggleGroupItem value="90d" className="rounded-lg px-3 text-xs data-[state=on]:bg-card data-[state=on]:shadow-sm">90D</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="oklch(var(--primary))"
                  stopOpacity={0.22}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(var(--primary))"
                  stopOpacity={0}
                />
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
                  indicator="dot"
                  formatter={(value, name) => {
                    if (name === 'revenue') return [`$${value} `, 'Revenue'];
                    return [value, 'Orders'];
                  }}
                />
              }
            />
            <Area
              dataKey="revenue"
              type="natural"
              fill="url(#fillRevenue)"
              stroke="oklch(var(--primary))"
              strokeWidth={2.25}
            />
            <Line
              dataKey="orders"
              type="monotone"
              stroke="oklch(var(--secondary))"
              strokeWidth={1.5}
              strokeOpacity={0.6}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};