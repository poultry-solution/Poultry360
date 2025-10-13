"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { ArrowLeft, BookOpen, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/common/store/store";

export default function DoctorLedgerPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Mock data for demonstration
  const ledgerEntries = [
    {
      id: "1",
      date: "2025-01-15",
      description: "Consultation - Ram Bahadur",
      type: "credit",
      amount: 500,
      balance: 500,
    },
    {
      id: "2", 
      date: "2025-01-14",
      description: "Vaccination Service - Sita Devi",
      type: "credit",
      amount: 300,
      balance: 800,
    },
    {
      id: "3",
      date: "2025-01-13", 
      description: "Emergency Visit - Hari Prasad",
      type: "credit",
      amount: 800,
      balance: 1100,
    },
    {
      id: "4",
      date: "2025-01-12",
      description: "Medicine Supply - Green Valley Farm",
      type: "debit",
      amount: 200,
      balance: 900,
    },
  ];

  const totalEarnings = ledgerEntries
    .filter(entry => entry.type === "credit")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = ledgerEntries
    .filter(entry => entry.type === "debit")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const currentBalance = totalEarnings - totalExpenses;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/doctor/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Financial Ledger</h1>
              <p className="text-muted-foreground">
                Track your consultation earnings and expenses
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{totalEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                From consultations and services
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ₹{totalExpenses.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Medicine and supply costs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ₹{currentBalance.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Net earnings after expenses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ledger Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Transaction History</span>
            </CardTitle>
            <CardDescription>
              All your financial transactions and consultations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ledgerEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      entry.type === "credit" ? "bg-green-500" : "bg-red-500"
                    }`}></div>
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      entry.type === "credit" ? "text-green-600" : "text-red-600"
                    }`}>
                      {entry.type === "credit" ? "+" : "-"}₹{entry.amount}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Balance: ₹{entry.balance}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Notice */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">🚧 Enhanced Features Coming Soon</CardTitle>
            <CardDescription className="text-amber-700">
              The ledger system will be enhanced with:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Real-time transaction tracking</li>
                <li>Invoice generation and management</li>
                <li>Payment reminders and follow-ups</li>
                <li>Detailed financial reports and analytics</li>
                <li>Integration with farmer payment systems</li>
                <li>Tax reporting and compliance tools</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
