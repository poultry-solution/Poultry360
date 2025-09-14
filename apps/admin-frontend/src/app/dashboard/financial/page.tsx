import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function FinancialPage() {
  return (
    <AdminLayout 
      title="Financial Overview" 
      description="Revenue analysis, profit tracking, and financial trends"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Overview Dashboard</CardTitle>
            <CardDescription>
              Total Revenue/Expenses, Profit Analysis, Revenue Trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Financial overview functionality will be implemented here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
