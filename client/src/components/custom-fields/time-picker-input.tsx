import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
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

export function TimePickerInput({
  value,
  onChange,
  className,
  disabled = false,
  label,
}: TimePickerInputProps) {
  const [open, setOpen] = useState(false);
  
  // Common time presets
  const timePresets = [
    { label: "8:00 AM", value: "08:00" },
    { label: "9:00 AM", value: "09:00" },
    { label: "10:00 AM", value: "10:00" },
    { label: "11:00 AM", value: "11:00" },
    { label: "12:00 PM", value: "12:00" },
    { label: "1:00 PM", value: "13:00" },
    { label: "2:00 PM", value: "14:00" },
    { label: "3:00 PM", value: "15:00" },
    { label: "4:00 PM", value: "16:00" },
    { label: "5:00 PM", value: "17:00" },
    { label: "6:00 PM", value: "18:00" },
    { label: "7:00 PM", value: "19:00" },
  ];

  return (
    <div className={cn("w-full", className)}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <Clock className="mr-2 h-4 w-4" />
            {value ? formatTo12Hour(value) : "Select time"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="grid grid-cols-2 gap-2 p-2">
            {timePresets.map((preset) => (
              <Button
                key={preset.value}
                variant={value === preset.value ? "default" : "outline"}
                size="sm"
                className="justify-start font-normal"
                onClick={() => {
                  onChange(preset.value);
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}