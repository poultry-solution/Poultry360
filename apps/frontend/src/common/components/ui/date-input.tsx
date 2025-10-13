"use client";

import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { useCalendar } from "@/common/hooks/useCalendar";

interface DateInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
}

export function DateInput({
  label,
  value,
  onChange,
  min,
  max,
  className,
}: DateInputProps) {
  const { calendarType, toISODate, toDisplayDate } = useCalendar();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (calendarType === 'BS') {
      // Convert BS to AD for storage
      const adDate = toISODate(inputValue);
      onChange(adDate.toISOString().split('T')[0]);
    } else {
      onChange(inputValue);
    }
  };

  // Display value in user's preferred calendar format
  const displayValue = value ? toDisplayDate(value, 'short') : '';

  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <Input
        type="date"
        value={displayValue}
        onChange={handleChange}
        min={min}
        max={max}
      />
      {calendarType === "BS" && (
        <p className="text-xs text-muted-foreground mt-1">
          Bikram Sambat (BS) Calendar
        </p>
      )}
    </div>
  );
}
