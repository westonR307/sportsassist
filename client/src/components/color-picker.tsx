import React, { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paintbrush, Check } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

// Predefined color palette
const colorPalette = [
  '#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3', 
  '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF', '#1E3A8A', '#065F46',
  '#3730A3', '#831843', '#78350F', '#1F2937', '#000000', '#FFFFFF'
];

// Helper function to determine if a color is light
const isLightColor = (colorHex: string): boolean => {
  // Default to false for invalid colors
  if (!colorHex || colorHex.length < 4) return false;
  
  // For simple #FFF or #FFFFFF detection
  const normalizedColor = colorHex.toLowerCase();
  if (normalizedColor === '#fff' || normalizedColor === '#ffffff') return true;
  
  try {
    // For proper calculation of other colors
    const hex = colorHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    
    // Calculate luminance - standard formula
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
  } catch (e) {
    console.error('Color parsing error:', e);
    return false;
  }
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [color, setColor] = useState(value || '#000000');
  const [isOpen, setIsOpen] = useState(false);

  // Memoize the text color calculation to avoid unnecessary re-renders
  const getTextClass = useCallback((bgColor: string) => {
    return isLightColor(bgColor) ? 'text-black' : 'text-white';
  }, []);

  // Safely update color when props change
  useEffect(() => {
    if (value && value !== color) {
      setColor(value);
    }
  }, [value, color]);

  // Handle manual color input changes
  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newColor = e.target.value;
      setColor(newColor);
      onChange(newColor);
    } catch (err) {
      console.error('Error handling color change:', err);
    }
  }, [onChange]);

  // Handle palette color selection
  const handlePaletteColorClick = useCallback((paletteColor: string) => {
    try {
      setColor(paletteColor);
      onChange(paletteColor);
    } catch (err) {
      console.error('Error handling palette color click:', err);
    }
  }, [onChange]);

  // Text color for current selection
  const textColorClass = getTextClass(color);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between border-input h-10"
          style={{ backgroundColor: color }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="h-5 w-5 rounded border"
              style={{ backgroundColor: color }}
            />
            <span className={textColorClass}>
              {color}
            </span>
          </div>
          <Paintbrush className={`h-4 w-4 ${textColorClass}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <div className="flex">
            <div className="w-1/3">
              <Input
                type="color"
                value={color}
                onChange={handleColorChange}
                className="h-10 p-1 w-full"
              />
            </div>
            <div className="w-2/3 pl-2">
              <Input
                type="text"
                value={color}
                onChange={handleColorChange}
                className="h-10 w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {colorPalette.map((paletteColor) => {
              const isSelected = color.toLowerCase() === paletteColor.toLowerCase();
              const buttonTextClass = getTextClass(paletteColor);
              
              return (
                <button
                  key={paletteColor}
                  type="button"
                  className="h-8 w-8 rounded-md border flex items-center justify-center"
                  style={{ backgroundColor: paletteColor }}
                  onClick={() => handlePaletteColorClick(paletteColor)}
                >
                  {isSelected && (
                    <Check className={`h-4 w-4 ${buttonTextClass}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}