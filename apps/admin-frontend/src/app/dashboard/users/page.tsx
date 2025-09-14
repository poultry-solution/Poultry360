import { AdminLayout } from '@/components/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function UsersPage() {
  return (
    <AdminLayout 
      title="User Management" 
      description="Manage users, view performance metrics, and analyze user data"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User Management Dashboard</CardTitle>
            <CardDescription>
              All Users Table, User Performance metrics, and Top performing users by revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              User management functionality will be implemented here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
