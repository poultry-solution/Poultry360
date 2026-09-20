"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { dateConfigMap, default as NepaliDate } from "nepali-date-converter";

import { Button } from "@/common/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { cn } from "@/common/lib/utils";

const MONTH_NAMES_EN = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
] as const;

const MONTH_KEYS = [
  "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Aswin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
] as const;

const MONTH_NAMES_NE = [
  "बैशाख", "जेठ", "असार", "श्रावण", "भाद्र", "आश्विन",
  "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुण", "चैत्र",
] as const;

const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAYS_NE = ["आइत", "सोम", "मंगल", "बुध", "बिहि", "शुक्र", "शनि"] as const;
const MIN_YEAR = 2000;
const MAX_YEAR = 2090;

export interface NepaliDatePickerValue {
  bsDate: string;
  adDate: string;
}

interface NepaliDatePickerProps {
  onChange?: (value: NepaliDatePickerValue) => void;
  defaultDate?: string | Date;
  theme?: "light" | "deepdark" | "dark";
  language?: "en" | "ne";
  className?: string;
}

function parseDefaultDate(defaultDate?: string | Date): { year: number; month: number; day: number } {
  if (typeof defaultDate === "string") {
    const [year, month, day] = defaultDate.split("-").map(Number);
    if (year && month && day) return { year, month, day };
  }

  if (defaultDate instanceof Date && !Number.isNaN(defaultDate.getTime())) {
    const date = new NepaliDate(defaultDate);
    return { year: date.getYear(), month: date.getMonth() + 1, day: date.getDate() };
  }

  const today = new NepaliDate();
  return { year: today.getYear(), month: today.getMonth() + 1, day: today.getDate() };
}

function toAdYmd(year: number, month: number, day: number): string {
  const ad = new NepaliDate(year, month - 1, day).getAD();
  return `${ad.year}-${String(ad.month + 1).padStart(2, "0")}-${String(ad.date).padStart(2, "0")}`;
}

export function NepaliDatePicker({
  onChange,
  defaultDate,
  theme = "light",
  language = "en",
  className,
}: NepaliDatePickerProps) {
  const initial = useMemo(() => parseDefaultDate(defaultDate), [defaultDate]);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setYear(initial.year);
    setMonth(initial.month);
    setSelectedDay(initial.day);
  }, [initial]);

  const monthKey = MONTH_KEYS[month - 1];
  const daysInMonth = dateConfigMap[String(year)]?.[monthKey] ?? 0;
  const firstDay = new NepaliDate(year, month - 1, 1).getDay();
  const weekdays = language === "ne" ? WEEKDAYS_NE : WEEKDAYS_EN;
  const monthNames = language === "ne" ? MONTH_NAMES_NE : MONTH_NAMES_EN;
  const selectedBsDate = `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;

  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const moveMonth = (delta: number) => {
    const next = month + delta;
    if (next < 1) {
      if (year <= MIN_YEAR) return;
      setYear(year - 1);
      setMonth(12);
      setSelectedDay(1);
    } else if (next > 12) {
      if (year >= MAX_YEAR) return;
      setYear(year + 1);
      setMonth(1);
      setSelectedDay(1);
    } else {
      setMonth(next);
      setSelectedDay(1);
    }
  };

  const selectDay = (day: number) => {
    setSelectedDay(day);
    onChange?.({ bsDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, adDate: toAdYmd(year, month, day) });
    setOpen(false);
  };

  const dark = theme === "dark" || theme === "deepdark";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between font-normal",
            dark ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white text-slate-900 hover:bg-slate-50",
            className
          )}
        >
          <span>{selectedBsDate}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "z-[10050] w-[calc(100vw-1rem)] max-w-[332px] p-0",
          dark ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900"
        )}
      >
        <div className={cn("flex items-center justify-between px-2 py-2", dark ? "bg-slate-700" : "bg-slate-100")}>
          <Button type="button" variant="ghost" size="icon" onClick={() => moveMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 items-center gap-0.5">
            <Select value={String(month)} onValueChange={(value) => { setMonth(Number(value)); setSelectedDay(1); }}>
              <SelectTrigger aria-label="Month" className="h-8 w-[108px] min-w-0 border-0 bg-transparent px-1 text-center text-sm shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[11000] max-h-[min(18rem,calc(100vh-1rem))]">
                {monthNames.map((name, index) => <SelectItem key={name} value={String(index + 1)}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(value) => { setYear(Number(value)); setSelectedDay(1); }}>
              <SelectTrigger aria-label="Year" className="h-8 w-[84px] min-w-0 border-0 bg-transparent px-1 text-center text-sm shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[11000] max-h-[min(18rem,calc(100vh-1rem))]">
                {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, index) => MIN_YEAR + index).map((value) => <SelectItem key={value} value={String(value)}>{language === "ne" ? value.toLocaleString("ne-NP") : value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => moveMonth(1)} aria-label="Next month">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="grid grid-cols-7 px-2 pt-2 text-center text-xs font-medium opacity-75">
          {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1 p-2">
          {cells.map((day, index) => day === null ? <span key={`empty-${index}`} className="h-9" /> : (
            <button key={day} type="button" onClick={() => selectDay(day)} className={cn("h-9 rounded-full text-sm hover:bg-slate-200 dark:hover:bg-slate-700", day === selectedDay && "bg-slate-700 text-white hover:bg-slate-700")}>
              {language === "ne" ? day.toLocaleString("ne-NP") : day}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
