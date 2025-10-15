"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Clock, Plus } from "lucide-react";

interface RemindersCardProps {
  reminders: Array<{
    id: number;
    title: string;
    date: string;
    time: string;
    type: string;
  }>;
  onAddReminder: () => void;
}

export function RemindersCard({ reminders, onAddReminder }: RemindersCardProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50/50 to-transparent pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base">Reminders</CardTitle>
              <CardDescription className="text-xs">
                Upcoming tasks
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onAddReminder}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:shadow-lg hover:shadow-purple-500/30 rounded-lg h-8 px-3"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-start space-x-3 p-3 border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {reminder.title}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {reminder.date} • {reminder.time}
                </p>
                <Badge className="mt-2 bg-purple-100 text-purple-700 border-0 text-xs">
                  {reminder.type}
                </Badge>
              </div>
            </div>
          ))}
          {reminders.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 mb-3">
                No reminders set
              </p>
              <Button
                size="sm"
                onClick={onAddReminder}
                className="bg-gradient-to-r from-purple-600 to-purple-500 hover:shadow-lg hover:shadow-purple-500/30 rounded-lg"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create Reminder
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
