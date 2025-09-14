import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PerformancePage() {
  return (
    <AdminLayout 
      title="Performance Metrics" 
      description="Mortality rates, feed conversion ratios, and profit analytics"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics Dashboard</CardTitle>
            <CardDescription>
              Mortality Rates, Feed Conversion Ratios, Profit per Bird analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Performance metrics functionality will be implemented here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
