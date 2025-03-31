import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCcw, XCircle } from "lucide-react";

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
  
  try {
    const [hours, minutes] = timeString.split(":").map(Number);
    
    // Validate that the parts are actual numbers
    if (isNaN(hours) || isNaN(minutes)) {
      return timeString; // Return the original string if it's not valid
    }
    
    // Check if the time values are within valid ranges
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return timeString; // Return the original string if values are out of range
    }
    
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12; // Convert 0 to 12
    
    return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return timeString; // Return the original string if there's an error
  }
}

// Convert 12hr format string to 24hr format for storage
function formatTo24Hour(timeString: string): string {
  if (!timeString) return "";
  
  try {
    // If the timestring already contains a colon, it might be in 24hr format already
    if (timeString.includes(":") && !timeString.includes("AM") && !timeString.includes("PM")) {
      // Make sure it's properly formatted
      const [hoursStr, minutesStr] = timeString.split(":");
      let hours = parseInt(hoursStr, 10);
      let minutes = parseInt(minutesStr, 10);
      
      // Validate that hours and minutes are valid numbers
      if (isNaN(hours) || isNaN(minutes)) {
        return "09:00"; // Default to 9 AM if invalid
      }
      
      // Check if the time values are within valid ranges
      hours = Math.max(0, Math.min(23, hours)); // Clamp hours between 0-23
      minutes = Math.max(0, Math.min(59, minutes)); // Clamp minutes between 0-59
      
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }
    
    // Handle 12hr format with AM/PM
    const isPM = timeString.toLowerCase().includes("pm");
    const isAM = timeString.toLowerCase().includes("am");
    const timeWithoutAmPm = timeString.toLowerCase().replace(/\s*[ap]m\s*/, "");
    
    let [hoursStr, minutesStr = "00"] = timeWithoutAmPm.split(":").map(part => part.trim());
    let hours = parseInt(hoursStr, 10);
    let minutes = parseInt(minutesStr, 10);
    
    // Validate that hours and minutes are valid numbers
    if (isNaN(hours) || isNaN(minutes)) {
      return "09:00"; // Default to 9 AM if invalid
    }
    
    // Check if the time values are within valid ranges
    hours = Math.max(1, Math.min(12, hours)); // Clamp hours between 1-12 for 12h format
    minutes = Math.max(0, Math.min(59, minutes)); // Clamp minutes between 0-59
    
    // Convert to 24 hour format
    if (isPM && hours < 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  } catch (error) {
    console.error("Error processing time:", error);
    return "09:00"; // Default to 9 AM if there's any error
  }
}

export function TimePickerInput({
  value,
  onChange,
  className,
  disabled = false,
  label,
}: TimePickerInputProps) {
  const [hasError, setHasError] = useState(false);
  const displayValue = value ? formatTo12Hour(value) : "";

  // Check if display value shows NaN which indicates an error
  useEffect(() => {
    setHasError(displayValue.includes("NaN"));
  }, [displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const timeValue = formatTo24Hour(inputValue);
    onChange(timeValue);
    
    // Reset error state when user types
    if (hasError) {
      setHasError(false);
    }
  };

  // Handle resetting the time to a default value
  const handleReset = () => {
    onChange("09:00"); // Default to 9:00 AM
    setHasError(false);
  };

  // Handle scroll for hour and minute adjustment
  const handleScroll = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    try {
      if (!value) {
        onChange("12:00");
        return;
      }
      
      // Validate the existing value first
      let hours = 9, minutes = 0;
      
      if (value.includes(":")) {
        const timeParts = value.split(":");
        const parsedHours = parseInt(timeParts[0], 10);
        const parsedMinutes = parseInt(timeParts[1], 10);
        
        // Check if valid numbers
        if (!isNaN(parsedHours) && !isNaN(parsedMinutes)) {
          hours = parsedHours;
          minutes = parsedMinutes;
        }
      }
      
      // Ensure we have valid values to start with
      hours = Math.max(0, Math.min(23, hours));
      minutes = Math.max(0, Math.min(59, minutes));
      
      const delta = e.deltaY > 0 ? -1 : 1; // Reverse scroll direction (scroll up increases)
      
      // Determine if cursor is in the first half (hours) or second half (minutes) of the input
      const inputElement = e.currentTarget;
      const cursorPosition = inputElement.selectionStart || 0;
      const inputLength = inputElement.value.length;
      
      let newHours = hours;
      let newMinutes = minutes;
      
      if (cursorPosition < inputLength / 2) {
        // Adjust hours
        newHours = (hours + delta + 24) % 24;
      } else {
        // Adjust minutes
        newMinutes = (minutes + delta * 5 + 60) % 60;
      }
      
      onChange(`${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`);
      
      // Reset error state when scroll adjusts time
      if (hasError) {
        setHasError(false);
      }
    } catch (error) {
      console.error("Error in scroll handler:", error);
      // Reset to a valid value if there's an error
      onChange("09:00");
      setHasError(false);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <div className="relative">
        <Input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onWheel={handleScroll}
          placeholder="e.g. 5:30 PM"
          disabled={disabled}
          className={cn("w-full time-input pr-10", hasError && "border-red-500")}
        />
        {hasError && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-red-500"
              onClick={handleReset}
              title="Reset time"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {hasError ? (
        <p className="text-xs text-red-500 mt-1">
          Invalid time format. Click the reset button or enter a valid time.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">
          Enter time in 12-hour format (e.g., 5:30 PM) or scroll to adjust
        </p>
      )}
    </div>
  );
}