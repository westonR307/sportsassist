import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paintbrush } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

// Basic color palette
const colorPalette = [
  '#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3', 
  '#3730A3', '#1E3A8A', '#065F46', '#831843', '#78350F', '#1F2937', 
  '#000000', '#FFFFFF'
];

export function ColorPicker(props: ColorPickerProps) {
  // Ensure we have a valid color or fallback to black
  const safeColor = (props.value && props.value.startsWith('#')) ? props.value : '#000000';
  
  // Extremely simple handler for the input field
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e && e.target && typeof e.target.value === 'string') {
      props.onChange(e.target.value);
    }
  }
  
  // Simple handler for palette color selection
  function handlePaletteClick(color: string) {
    props.onChange(color);
  }
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between h-10" 
          style={{ backgroundColor: safeColor }}>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded border" 
              style={{ backgroundColor: safeColor }} />
            <span style={{ color: safeColor === '#FFFFFF' || safeColor === '#fff' ? '#000000' : '#FFFFFF' }}>
              {safeColor}
            </span>
          </div>
          <Paintbrush className="h-4 w-4" style={{ color: safeColor === '#FFFFFF' ? '#000000' : '#FFFFFF' }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="color"
              value={safeColor}
              onChange={handleChange}
              className="w-1/3"
            />
            <Input
              type="text"
              value={safeColor}
              onChange={handleChange}
              className="w-2/3"
            />
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {colorPalette.map((color) => (
              <button
                key={color}
                className="h-6 w-6 rounded-md border"
                style={{ backgroundColor: color }}
                onClick={() => handlePaletteClick(color)}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}