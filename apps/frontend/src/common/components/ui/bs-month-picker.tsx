"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Label } from "@/common/components/ui/label";
import {
  BS_MONTH_NAMES,
  getBSYearMonthFromAD,
  getFirstDayOfBSMonthAD,
} from "@/common/lib/nepali-date";

interface BSMonthPickerProps {
  label?: string;
  value: string;
  onChange: (adDateFirstOfMonth: string) => void;
  className?: string;
}

const BS_YEAR_RANGE = 5;

export function BSMonthPicker({ label, value, onChange, className }: BSMonthPickerProps) {
  const now = new Date();
  const { year: currentBSYear } = getBSYearMonthFromAD(now);
  const years = Array.from(
    { length: BS_YEAR_RANGE * 2 + 1 },
    (_, i) => currentBSYear - BS_YEAR_RANGE + i
  );

  let bsYear = currentBSYear;
  let bsMonth = 1;
  if (value) {
    try {
      const parsed = getBSYearMonthFromAD(value);
      bsYear = parsed.year;
      bsMonth = parsed.month;
    } catch {
      // keep defaults
    }
  }

  const handleYearChange = (y: string) => {
    const yNum = parseInt(y, 10);
    onChange(getFirstDayOfBSMonthAD(yNum, bsMonth));
  };

  const handleMonthChange = (m: string) => {
    const mNum = parseInt(m, 10);
    onChange(getFirstDayOfBSMonthAD(bsYear, mNum));
  };

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <div className="flex gap-2">
        <Select value={String(bsYear)} onValueChange={handleYearChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(bsMonth)} onValueChange={handleMonthChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {BS_MONTH_NAMES.map((name, i) => (
              <SelectItem key={name} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
