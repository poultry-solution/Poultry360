"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { Lightbulb } from "lucide-react";

export default function BusinessInsightsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Business Insights</h1>
                    <p className="text-muted-foreground">
                        Advanced analytics and AI-driven insights for your business
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Lightbulb className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Coming Soon</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            We are working hard to bring you powerful business insights.
                            Check back soon for updates!
                        </p>
                        <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                            Under Development
                        </Badge>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
