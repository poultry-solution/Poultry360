import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Plus, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BatchesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
          <p className="text-muted-foreground">
            Track your production batches and performance.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          New Batch
        </Button>
      </div>

      {/* Batch Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Birds</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <p className="text-xs text-muted-foreground">Across all batches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Mortality</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3%</div>
            <p className="text-xs text-muted-foreground">Industry standard: 3%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Batches List */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Batch #B-2024-001</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
            </CardTitle>
            <CardDescription>Farm A • Started: Jan 15, 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Initial Birds:</span>
                <p className="font-medium">2,500</p>
              </div>
              <div>
                <span className="text-muted-foreground">Current Birds:</span>
                <p className="font-medium">2,445</p>
              </div>
              <div>
                <span className="text-muted-foreground">Age:</span>
                <p className="font-medium">32 days</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium text-green-600">Growing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Batch #B-2024-002</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
            </CardTitle>
            <CardDescription>Farm B • Started: Jan 20, 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Initial Birds:</span>
                <p className="font-medium">2,000</p>
              </div>
              <div>
                <span className="text-muted-foreground">Current Birds:</span>
                <p className="font-medium">1,980</p>
              </div>
              <div>
                <span className="text-muted-foreground">Age:</span>
                <p className="font-medium">27 days</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium text-green-600">Growing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
