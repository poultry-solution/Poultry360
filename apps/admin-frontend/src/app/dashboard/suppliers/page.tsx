import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SuppliersPage() {
  return (
    <AdminLayout 
      title="Supplier Analytics" 
      description="Manage dealers, hatcheries, and medical suppliers"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Supplier Analytics Dashboard</CardTitle>
            <CardDescription>
              All Dealers, All Hatcheries, All Medical Suppliers management and tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Supplier analytics functionality will be implemented here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
