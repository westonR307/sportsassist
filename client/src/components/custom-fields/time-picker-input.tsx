import React, { useState } from "react";
import { Input } from "@/components/ui/input";
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

export function TimePickerInput({
  value,
  onChange,
  className,
  disabled = false,
  label,
}: TimePickerInputProps) {
  const [open, setOpen] = useState(false);
  
  // Split time into hours and minutes
  const timeValue = value || "08:00";
  const [hours, minutes] = timeValue.split(":").map(Number);
  
  const [localHour, setLocalHour] = useState<number>(hours);
  const [localMinute, setLocalMinute] = useState<number>(minutes);
  const [period, setPeriod] = useState<"AM" | "PM">(hours >= 12 ? "PM" : "AM");

  // Format the time string
  const formatTimeString = (h: number, m: number): string => {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  // Handle direct input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    
    // Update local state if the value is valid
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(e.target.value)) {
      const [h, m] = e.target.value.split(":").map(Number);
      setLocalHour(h);
      setLocalMinute(m);
      setPeriod(h >= 12 ? "PM" : "AM");
    }
  };
  
  // Handle hour selection
  const handleHourChange = (hour: number) => {
    const h = period === "PM" && hour < 12 ? hour + 12 : (period === "AM" && hour === 12 ? 0 : hour);
    setLocalHour(h);
    
    const newTimeValue = formatTimeString(h, localMinute);
    onChange(newTimeValue);
  };
  
  // Handle minute selection
  const handleMinuteChange = (minute: number) => {
    setLocalMinute(minute);
    
    const newTimeValue = formatTimeString(localHour, minute);
    onChange(newTimeValue);
  };
  
  // Toggle AM/PM
  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    setPeriod(newPeriod);
    
    let h = localHour;
    if (newPeriod === "AM" && h >= 12) {
      h -= 12;
    } else if (newPeriod === "PM" && h < 12) {
      h += 12;
    }
    
    setLocalHour(h);
    const newTimeValue = formatTimeString(h, localMinute);
    onChange(newTimeValue);
  };
  
  // Display hour in 12-hour format
  const displayHour = () => {
    const h = localHour % 12;
    return h === 0 ? 12 : h;
  };
  
  // Generate hour options (1-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  
  // Generate minute options (0, 15, 30, 45)
  const minuteOptions = [0, 15, 30, 45];

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
            {value || "Select time"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <Label>Hours</Label>
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {hourOptions.map((hour) => (
                      <Button
                        key={hour}
                        type="button"
                        variant={hour === displayHour() ? "default" : "outline"}
                        className="h-8 w-8 p-0"
                        onClick={() => handleHourChange(hour === 12 ? (period === "AM" ? 0 : 12) : (period === "PM" ? hour + 12 : hour))}
                      >
                        {hour}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label>Minutes</Label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {minuteOptions.map((minute) => (
                      <Button
                        key={minute}
                        type="button"
                        variant={minute === localMinute ? "default" : "outline"}
                        className="h-8 w-full p-0"
                        onClick={() => handleMinuteChange(minute)}
                      >
                        {minute.toString().padStart(2, "0")}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button
                type="button"
                variant={period === "AM" ? "default" : "outline"}
                className="w-16"
                onClick={() => handlePeriodChange("AM")}
              >
                AM
              </Button>
              <Button
                type="button"
                variant={period === "PM" ? "default" : "outline"}
                className="w-16"
                onClick={() => handlePeriodChange("PM")}
              >
                PM
              </Button>
            </div>
          </div>
          <div className="p-3 border-t">
            <Input
              type="time"
              value={value}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}