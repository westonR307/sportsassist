import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

type TimeSlot = {
  startTime: string;
  endTime: string;
};

type TimeSlotPickerProps = {
  slots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
};

export function TimeSlotPicker({ slots, onChange }: TimeSlotPickerProps) {
  // Handle time slot changes
  const updateSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    
    // Ensure end time is after start time
    if (field === 'startTime' && newSlots[index].startTime >= newSlots[index].endTime) {
      // Add one hour to start time for end time
      const [hours, minutes] = newSlots[index].startTime.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0);
      date.setHours(date.getHours() + 1);
      
      newSlots[index].endTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    onChange(newSlots);
  };
  
  // Add a new time slot
  const addSlot = () => {
    // Default to 1 hour after the last slot, or 9am if no slots
    let newStartTime = '09:00';
    let newEndTime = '10:00';
    
    if (slots.length > 0) {
      const lastSlot = slots[slots.length - 1];
      
      // Try to schedule 30 minutes after the last slot ends
      const [hours, minutes] = lastSlot.endTime.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0);
      date.setMinutes(date.getMinutes() + 30);
      
      newStartTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      
      // End time is 1 hour after start time
      date.setHours(date.getHours() + 1);
      newEndTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    onChange([...slots, { startTime: newStartTime, endTime: newEndTime }]);
  };
  
  // Remove a time slot
  const removeSlot = (index: number) => {
    const newSlots = [...slots];
    newSlots.splice(index, 1);
    onChange(newSlots);
  };
  
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        {slots.map((slot, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Input
              type="time"
              value={slot.startTime}
              onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
              className="w-28"
            />
            <span>to</span>
            <Input
              type="time"
              value={slot.endTime}
              onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
              className="w-28"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeSlot(index)}
              disabled={slots.length === 1}
              title="Remove slot"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={addSlot}
        className="flex items-center"
      >
        <Plus className="h-4 w-4 mr-1" /> Add Time Slot
      </Button>
      
      <div className="text-sm text-muted-foreground mt-2">
        You can add multiple time slots for the same day if needed.
      </div>
    </div>
  );
}