import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <AdminLayout 
      title="Reports & Analytics" 
      description="Revenue reports, performance analysis, and trend insights"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Reports & Analytics Dashboard</CardTitle>
            <CardDescription>
              Revenue Reports, Performance Reports, Trend Analysis visualizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Reports and analytics functionality will be implemented here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
