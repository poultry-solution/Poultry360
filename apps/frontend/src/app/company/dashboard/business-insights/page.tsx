"use client";

import React, { useState } from "react";
import {
    Users,
    TrendingUp,
    CreditCard,
    AlertCircle,
    Search,
    Filter,
    Download
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/common/components/ui/data-table";
import { useGetDealerInsights } from "@/fetchers/company/insightsQueries";
import { Loader2 } from "lucide-react";

export default function BusinessInsightsPage() {
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");

    const { data: insightsData, isLoading } = useGetDealerInsights();

    const summary = insightsData?.data?.summary;
    const dealers = insightsData?.data?.dealers || [];

    const filteredDealers = dealers.filter((d: any) => {
        const matchesSearch =
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.location.toLowerCase().includes(search.toLowerCase());

        if (filter === "active") return matchesSearch && d.isActive;
        if (filter === "inactive") return matchesSearch && !d.isActive;
        if (filter === "high_balance") return matchesSearch && Number(d.pendingBalance) > 10000;

        return matchesSearch;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NP', {
            style: 'currency',
            currency: 'NPR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const dealerColumns = [
        {
            key: "name",
            label: "Dealer Name",
            render: (value: string, row: any) => (
                <div className="flex flex-col">
                    <span className="font-medium">{value}</span>
                    <span className="text-xs text-muted-foreground">{row.location}</span>
                </div>
            )
        },
        {
            key: "connectedFarmers",
            label: "Farmers",
            align: "center" as const,
            render: (value: number) => (
                <Badge variant="secondary" className="px-2">
                    {value}
                </Badge>
            )
        },
        {
            key: "monthlySales",
            label: "Company Sales (Month)",
            align: "right" as const,
            render: (value: number) => formatCurrency(value)
        },
        {
            key: "totalSales",
            label: "Company Sales (Total)",
            align: "right" as const,
            render: (value: number) => formatCurrency(value)
        },
        // NEW: Dealer Sales Metrics
        {
            key: "dealerMonthlySales",
            label: "Dealer Sales (Month)",
            align: "right" as const,
            render: (value: number) => (
                <span className="text-blue-600">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: "dealerTotalSales",
            label: "Dealer Sales (Total)",
            align: "right" as const,
            render: (value: number) => formatCurrency(value)
        },
        {
            key: "farmerReceivables",
            label: "Farmer Pending",
            align: "right" as const,
            render: (value: number) => (
                <span className={Number(value) > 50000 ? "text-amber-600 font-medium" : ""}>
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: "pendingBalance",
            label: "Company Pending",
            align: "right" as const,
            render: (value: number) => (
                <span className={Number(value) > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: "isActive",
            label: "Status",
            align: "center" as const,
            render: (value: boolean) => (
                <Badge variant={value ? "default" : "destructive"}>
                    {value ? "Active" : "Inactive"}
                </Badge>
            )
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg">Loading insights...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Business Insights</h1>
                    <p className="text-muted-foreground mt-1">
                        Track dealer performance, sales volume, and credit exposure.
                    </p>
                </div>

                {/* Date / Export Controls could go here */}
                {/* <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export Report
        </Button> */}
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Dealers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary?.totalDealers || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Connected to your company
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Network Reach</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary?.totalActiveFarmers || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Total connected farmers across all dealers
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Company Receivables</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(summary?.totalReceivable || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Pending from dealers
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dealer Receivables</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {formatCurrency(summary?.totalDealerReceivables || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            What farmers owe to your dealers
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <Card className="col-span-4">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <CardTitle>Dealer Performance Matrix</CardTitle>
                            <CardDescription>
                                Detailed breakdown of sales and credit status per dealer.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-full md:w-auto">
                                <TabsList>
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    <TabsTrigger value="active">Active</TabsTrigger>
                                    <TabsTrigger value="high_balance">Risk</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <div className="relative w-full md:w-48">
                                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 h-9"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={dealerColumns}
                        data={filteredDealers}
                        showFooter={true}
                        footerContent={
                            <div className="text-sm text-muted-foreground w-full text-right">
                                Showing {filteredDealers.length} dealers
                            </div>
                        }
                    />
                </CardContent>
            </Card>
        </div>
    );
}
