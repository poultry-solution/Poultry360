"use client";

import { CardHeader } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { ArrowLeft, MoreVertical, Trash2 } from "lucide-react";
import React from "react";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  isOnline?: boolean;
  onBack: () => void;
  onDelete?: () => void;
}

export default function ChatHeader({ title, subtitle, isOnline, onBack, onDelete }: ChatHeaderProps) {
  const initials = React.useMemo(() => {
    const trimmed = (title || "").trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(/\s+/);
    const val = parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
    return val || "?";
  }, [title]);

  return (
    <CardHeader className="pb-4 ">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2 cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">{initials}</span>
          </div>
          <div>
            <div className="text-lg font-semibold leading-none tracking-tight">{title || "Unknown"}</div>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant="secondary"
            className={`${isOnline ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
          >
            {isOnline ? "Online" : "Offline"}
          </Badge>
          {onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger> 
                <Button variant="ghost" size="sm" className="p-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </CardHeader>
  );
}


