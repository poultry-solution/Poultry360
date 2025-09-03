import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FarmsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Farms</h1>
          <p className="text-muted-foreground">
            Manage your farm locations and details.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Farm
        </Button>
      </div>

      {/* Farms Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Farm A
            </CardTitle>
            <CardDescription>Bharatpur, Chitwan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium">5,000 birds</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Batches:</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-green-600 font-medium">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Farm B
            </CardTitle>
            <CardDescription>Pokhara, Kaski</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium">3,500 birds</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Batches:</span>
                <span className="font-medium">1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-green-600 font-medium">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Farm C
            </CardTitle>
            <CardDescription>Butwal, Rupandehi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium">4,000 birds</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Batches:</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-green-600 font-medium">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
