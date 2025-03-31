import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TimePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  label?: string;
}

// Convert 24hr format time string to 12hr format for display
function formatTo12Hour(timeString: string): string {
  if (!timeString) return "";
  
  const [hours, minutes] = timeString.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12; // Convert 0 to 12
  
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Convert 12hr format string to 24hr format for storage
function formatTo24Hour(timeString: string): string {
  if (!timeString) return "";
  
  // If the timestring already contains a colon, it might be in 24hr format already
  if (timeString.includes(":") && !timeString.includes("AM") && !timeString.includes("PM")) {
    // Make sure it's properly formatted
    const [hours, minutes] = timeString.split(":").map(Number);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }
  
  // Handle 12hr format with AM/PM
  const isPM = timeString.toLowerCase().includes("pm");
  const timeWithoutAmPm = timeString.toLowerCase().replace(/\s*[ap]m\s*/, "");
  
  let [hours, minutes = "00"] = timeWithoutAmPm.split(":").map(part => part.trim());
  let hour = parseInt(hours, 10);
  
  if (isPM && hour < 12) {
    hour += 12;
  } else if (!isPM && hour === 12) {
    hour = 0;
  }
  
  return `${hour.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

export function TimePickerInput({
  value,
  onChange,
  className,
  disabled = false,
  label,
}: TimePickerInputProps) {
  const displayValue = value ? formatTo12Hour(value) : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const timeValue = formatTo24Hour(inputValue);
    onChange(timeValue);
  };

  return (
    <div className={cn("w-full", className)}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder="e.g. 5:30 PM"
        disabled={disabled}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground mt-1">
        Enter time in 12-hour format (e.g., 5:30 PM or 9:00 AM)
      </p>
    </div>
  );
}