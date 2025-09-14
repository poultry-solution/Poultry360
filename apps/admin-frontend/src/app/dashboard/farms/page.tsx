import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function FarmsPage() {
  return (
    <AdminLayout 
      title="Farm Analytics" 
      description="Farm performance comparison, capacity utilization, and analytics"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Farm Analytics Dashboard</CardTitle>
            <CardDescription>
              All Farms Table, Farm Performance Comparison, Top Performing Farms, Farm Capacity Utilization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Farm analytics functionality will be implemented here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
