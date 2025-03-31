import React, { useEffect } from "react";
import TimePicker from "react-time-picker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TimePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  label?: string;
}

// Convert 24hr format string to proper 24hr format for storage
function formatTime(timeString: string | null): string {
  if (!timeString) return "";
  
  const [hours, minutes] = timeString.split(":").map(Number);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function TimePickerInput({
  value,
  onChange,
  className,
  disabled = false,
  label,
}: TimePickerInputProps) {
  const handleTimeChange = (newValue: string | null) => {
    // Format the time to ensure it's in proper 24-hour format
    const formattedTime = formatTime(newValue);
    onChange(formattedTime);
  };

  return (
    <div className={cn("w-full", className)}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <div className="w-full border border-input rounded-md p-1">
        <TimePicker
          onChange={handleTimeChange}
          value={value}
          disableClock={false}
          className="w-full"
          format="h:mm a"
          clearIcon={null}
          disabled={disabled}
          clockIcon={null}
          hourPlaceholder="hh"
          minutePlaceholder="mm"
          amPmAriaLabel="Select AM/PM"
        />
      </div>
    </div>
  );
}