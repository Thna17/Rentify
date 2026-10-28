import { Calendar, Package, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentify/shared/ui/select';
import { PageHeader } from '../../layouts/dashboard/PageHeader';
import useStats from '../../hooks/useStats';
import { MetricCard } from './components/MetricCard';
// @ts-expect-error Legacy JSX component has no declaration file yet.
import { TopProducts } from './components/TopProducts';
// @ts-expect-error Legacy JSX component has no declaration file yet.
import { RevenueChart } from './components/RevenueChart';
// @ts-expect-error Legacy JSX component has no declaration file yet.
import { RecentOrders } from './components/RecentOrders';
import { LaunchChecklist } from './LaunchChecklist';

const copy = {
  en: {
    title: 'Overview', description: 'See what needs attention, prepare each sales channel, and monitor real Store activity.',
    addProduct: 'Add Product', performance: 'Store performance', performanceHelp: 'Operational data for the selected period.',
    unavailable: 'Performance data is temporarily unavailable. Your launch checklist is still available above.',
    denied: 'You do not have permission to view Store performance.', today: 'Today', seven: 'Last 7 days', thirty: 'Last 30 days', ninety: 'Last 90 days',
    comparison: 'vs previous period', sales: 'Sales', loadingRevenue: 'Loading revenue data', revenue: 'Revenue', orders: 'Orders',
    topProducts: 'Top products', byRevenue: 'By revenue', sold: 'sold', noSales: 'No sales yet', bestSellers: 'Your best sellers will show up here.',
    recentOrders: 'Recent orders', viewAll: 'View all', noOrders: 'No orders yet in this period.', customer: 'Customer', date: 'Date', status: 'Status', total: 'Total', guest: 'Guest', order: 'Order',
    orderStatuses: { pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', completed: 'Completed', fulfilled: 'Fulfilled', cancelled: 'Cancelled' },
  },
  kh: {
    title: 'ទិដ្ឋភាពទូទៅ', description: 'មើលអ្វីដែលត្រូវការការយកចិត្តទុកដាក់ ត្រៀមបណ្តាញលក់នីមួយៗ និងតាមដានសកម្មភាពពិតរបស់ហាង។',
    addProduct: 'បន្ថែមផលិតផល', performance: 'លទ្ធផលប្រតិបត្តិការរបស់ហាង', performanceHelp: 'ទិន្នន័យប្រតិបត្តិការសម្រាប់រយៈពេលដែលបានជ្រើសរើស។',
    unavailable: 'ទិន្នន័យលទ្ធផលមិនអាចប្រើបានបណ្តោះអាសន្ន។ បញ្ជីត្រៀមដាក់ឱ្យដំណើរការនៅតែអាចប្រើបានខាងលើ។',
    denied: 'អ្នកមិនមានសិទ្ធិមើលលទ្ធផលរបស់ហាងទេ។', today: 'ថ្ងៃនេះ', seven: '៧ ថ្ងៃចុងក្រោយ', thirty: '៣០ ថ្ងៃចុងក្រោយ', ninety: '៩០ ថ្ងៃចុងក្រោយ',
    comparison: 'ធៀបនឹងរយៈពេលមុន', sales: 'ការលក់', loadingRevenue: 'កំពុងផ្ទុកទិន្នន័យចំណូល', revenue: 'ចំណូល', orders: 'ការបញ្ជាទិញ',
    topProducts: 'ផលិតផលលក់ដាច់', byRevenue: 'តាមចំណូល', sold: 'បានលក់', noSales: 'មិនទាន់មានការលក់', bestSellers: 'ផលិតផលលក់ដាច់របស់អ្នកនឹងបង្ហាញនៅទីនេះ។',
    recentOrders: 'ការបញ្ជាទិញថ្មីៗ', viewAll: 'មើលទាំងអស់', noOrders: 'មិនទាន់មានការបញ្ជាទិញក្នុងរយៈពេលនេះ។', customer: 'អតិថិជន', date: 'កាលបរិច្ឆេទ', status: 'ស្ថានភាព', total: 'សរុប', guest: 'ភ្ញៀវ', order: 'ការបញ្ជាទិញ',
    orderStatuses: { pending: 'កំពុងរង់ចាំ', confirmed: 'បានបញ្ជាក់', processing: 'កំពុងរៀបចំ', completed: 'បានបញ្ចប់', fulfilled: 'បានបំពេញ', cancelled: 'បានលុបចោល' },
  },
};

export const Overview = () => {
  const navigate = useNavigate();
  const { language } = useTranslation() as { language?: string };
  const text = copy[language === 'kh' ? 'kh' : 'en'];
  const { loading, error, ownershipError, metrics, revenueData, productSales, recentOrders, dateRange, selectedPeriod, handlePeriodChange } = useStats();
  const periodLabels: Record<string, string> = { '24h': text.today, '7d': text.seven, '30d': text.thirty, '90d': text.ninety };

  return (
    <div className="min-h-full">
      <PageHeader
        title={text.title}
        description={text.description}
        icon={Store}
        breadcrumb={[{ label: text.title }]}
        actions={<Button type="button" onClick={() => navigate('/products/create')}><Package className="mr-2 h-4 w-4" aria-hidden="true" />{text.addProduct}</Button>}
      />
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <LaunchChecklist />

        <section aria-labelledby="store-performance-heading" className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="store-performance-heading" className="text-xl font-semibold tracking-tight">{text.performance}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text.performanceHelp}</p>
            </div>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger aria-label={text.performanceHelp} className="h-10 w-full bg-card sm:w-[190px]">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <SelectValue>{periodLabels[selectedPeriod] || text.seven}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">{text.today}</SelectItem><SelectItem value="7d">{text.seven}</SelectItem>
                <SelectItem value="30d">{text.thirty}</SelectItem><SelectItem value="90d">{text.ninety}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(error || ownershipError) ? (
            <Card role="alert" className="border-destructive/20"><CardContent className="p-5 text-sm text-destructive">{ownershipError ? text.denied : text.unavailable}</CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric: any, index: number) => <MetricCard key={`${metric.title}-${index}`} {...metric} loading={loading} comparisonLabel={text.comparison} />)}
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="xl:col-span-2"><RevenueChart data={revenueData} dateRange={dateRange} isLoading={loading} labels={{ sales: text.sales, loading: text.loadingRevenue, revenue: text.revenue, orders: text.orders }} locale={language === 'kh' ? 'km-KH' : 'en-US'} /></div>
                <TopProducts products={productSales} isLoading={loading} labels={{ title: text.topProducts, byRevenue: text.byRevenue, sold: text.sold, empty: text.noSales, emptyHelp: text.bestSellers }} />
              </div>
              <RecentOrders orders={recentOrders} isLoading={loading} locale={language === 'kh' ? 'km-KH' : 'en-US'} statusLabels={text.orderStatuses} labels={{ title: text.recentOrders, viewAll: text.viewAll, empty: text.noOrders, order: text.order, customer: text.customer, date: text.date, status: text.status, total: text.total, guest: text.guest }} />
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Overview;
