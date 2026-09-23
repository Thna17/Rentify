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
      <Card className="col-span-1 lg:col-span-2 border border-border rounded-lg shadow-sm bg-background">
        <CardHeader>
          <CardTitle>Revenue & Orders</CardTitle>
          <CardDescription>Loading revenue data</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[300px]" />
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
      color: "hsl(var(--primary))",
    },
    orders: {
      label: "Orders",
      color: "hsl(var(--secondary))",
    },
  };

  return (
    <Card className="col-span-1 lg:col-span-2 border border-border rounded-lg shadow-sm bg-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Revenue & Orders</CardTitle>
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
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="7d">7D</ToggleGroupItem>
          <ToggleGroupItem value="30d">30D</ToggleGroupItem>
          <ToggleGroupItem value="90d">90D</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--primary)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--primary)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
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
              stroke="var(--primary)"
              strokeWidth={2}
            />
            <Line
              dataKey="orders"
              type="monotone"
              stroke="var(--secondary)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};