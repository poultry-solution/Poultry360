import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BatchesPage() {
  return (
    <AdminLayout 
      title="Batch Management" 
      description="Batch performance metrics, timeline management, and analytics"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Batch Management Dashboard</CardTitle>
            <CardDescription>
              All Batches Table, Batch Performance Metrics, Interactive Batch Timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Batch management functionality will be implemented here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
