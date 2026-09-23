import { Card, CardContent, CardHeader, CardTitle } from "@rentify/shared/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Globe, DollarSign, Eye, BarChart3 } from 'lucide-react';

const analyticsData = {
  traffic: [
    { day: 'Mon', visitors: 4000 },
    { day: 'Tue', visitors: 3000 },
    { day: 'Wed', visitors: 5000 },
    { day: 'Thu', visitors: 4500 },
    { day: 'Fri', visitors: 6000 },
  ],
  templatePopularity: [
    { template: 'Portfolio Pro', sales: 2400 },
    { template: 'E-Commerce', sales: 4567 },
    { template: 'Blog', sales: 1398 },
  ],
  metrics: {
    totalWebsites: 45,
    activeUsers: 2345,
    revenue: 45200
  }
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border rounded-xl p-3 shadow-lg">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-primary">
          {payload[0].dataKey === 'visitors' ? 'Visitors' : 'Sales'}:{" "}
          <span className="font-bold">{payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const PlatformAnalytics = () => {
  // Colors that work well with shadcn theme
  const primaryColor = 'hsl(var(--primary))';
  const secondaryColor = 'hsl(var(--secondary))';
  const successColor = 'hsl(var(--chart-1))';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Platform Analytics
          </h2>
          <p className="text-muted-foreground mt-2">
            Real-time insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>Last 30 days</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Websites Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">Total Websites</span>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {analyticsData.metrics.totalWebsites}
                </p>
                <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% from last month
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Users Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 group-hover:from-green-500/10 group-hover:to-emerald-500/10 transition-all" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Active Users</span>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {analyticsData.metrics.activeUsers.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +8% from last month
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 group-hover:from-amber-500/10 group-hover:to-orange-500/10 transition-all" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Revenue (30d)</span>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  ${analyticsData.metrics.revenue.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +15% from last month
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Overview Chart */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Eye className="h-5 w-5 text-primary" />
              Traffic Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.traffic}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--muted))"
                    opacity={0.3}
                  />
                  <XAxis 
                    dataKey="day" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="visitors" 
                    stroke={primaryColor}
                    strokeWidth={3}
                    dot={{ fill: primaryColor, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: primaryColor, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Weekly visitor trends</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                +24% this week
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Template Popularity Chart */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <BarChart3 className="h-5 w-5 text-secondary" />
              Template Popularity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.templatePopularity}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--muted))"
                    opacity={0.3}
                  />
                  <XAxis 
                    dataKey="template" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="sales" 
                    fill={secondaryColor}
                    radius={[4, 4, 0, 0]}
                    className="hover:opacity-80 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Template sales performance</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                E-Commerce leads by 87%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">98%</p>
              <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">2.3s</p>
              <p className="text-sm text-muted-foreground">Avg. Load Time</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">99.9%</p>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformAnalytics;