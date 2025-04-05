import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paintbrush, Check } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

// Simplified, safe predefined color palette
const colorPalette = [
  '#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3', 
  '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF', '#1E3A8A', '#065F46',
  '#3730A3', '#831843', '#78350F', '#1F2937', '#000000', '#FFFFFF'
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  // Use a safe default color if value is invalid
  const defaultColor = '#000000';
  const [color, setColor] = useState(
    value && /^#([0-9A-F]{3}){1,2}$/i.test(value) ? value : defaultColor
  );
  const [isOpen, setIsOpen] = useState(false);

  // Safely handle prop changes
  useEffect(() => {
    if (value && /^#([0-9A-F]{3}){1,2}$/i.test(value) && value !== color) {
      setColor(value);
    }
  }, [value]);

  // Simple safe function to determine if a color is light
  const isLight = (hexColor: string): boolean => {
    try {
      // Simple validation first
      if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) {
        return false;
      }

      // Special cases for white
      if (hexColor.toLowerCase() === '#fff' || hexColor.toLowerCase() === '#ffffff') {
        return true;
      }

      // Convert to RGB 
      let hex = hexColor.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
      }
      
      if (!/^[0-9a-f]{6}$/i.test(hex)) {
        return false;
      }
      
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
    } catch (e) {
      return false;
    }
  };

  // Safe handler for text input color change
  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      let newColor = e.target.value || '';
      
      // Handle empty input
      if (newColor === '') {
        setColor(defaultColor);
        onChange(defaultColor);
        return;
      }
      
      // Add # prefix if missing
      if (!newColor.startsWith('#')) {
        newColor = `#${newColor}`;
      }
      
      // Update state (always update local state for UX)
      setColor(newColor);
      
      // Only update parent if valid hex
      if (/^#([0-9A-F]{3}){1,2}$/i.test(newColor)) {
        onChange(newColor);
      }
    } catch (error) {
      console.error('Error in text input handler:', error);
      // Don't update on error
    }
  };

  // Safe handler for color input change (browser's native color picker)
  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newColor = e.target.value;
      if (newColor && typeof newColor === 'string') {
        setColor(newColor);
        onChange(newColor);
      }
    } catch (error) {
      console.error('Error in color input handler:', error);
    }
  };

  // Safe handler for palette color selection
  const handlePaletteSelect = (paletteColor: string) => {
    try {
      if (paletteColor && typeof paletteColor === 'string' && /^#([0-9A-F]{3}){1,2}$/i.test(paletteColor)) {
        setColor(paletteColor);
        onChange(paletteColor);
      }
    } catch (error) {
      console.error('Error in palette selection:', error);
    }
  };

  // Safely determine text color for contrast
  const textColor = isLight(color) ? 'text-black' : 'text-white';
  
  // Use a safe background color for the button
  const buttonBgColor = /^#([0-9A-F]{3}){1,2}$/i.test(color) ? color : defaultColor;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between border-input h-10"
          style={{ backgroundColor: buttonBgColor }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="h-5 w-5 rounded border"
              style={{ backgroundColor: buttonBgColor }}
            />
            <span className={textColor}>
              {color}
            </span>
          </div>
          <Paintbrush className={`h-4 w-4 ${textColor}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <div className="flex">
            <div className="w-1/3">
              <Input
                type="color"
                value={color}
                onChange={handleColorInputChange}
                className="h-10 p-1 w-full"
              />
            </div>
            <div className="w-2/3 pl-2">
              <Input
                type="text"
                value={color}
                onChange={handleTextInputChange}
                className="h-10 w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {colorPalette.map((paletteColor) => {
              // Safe color comparison
              const isSelected = color.toLowerCase() === paletteColor.toLowerCase();
              // Safe text color determination for checkmark
              const checkColor = isLight(paletteColor) ? 'text-black' : 'text-white';
              
              return (
                <button
                  key={paletteColor}
                  type="button"
                  className="h-8 w-8 rounded-md border flex items-center justify-center"
                  style={{ backgroundColor: paletteColor }}
                  onClick={() => handlePaletteSelect(paletteColor)}
                >
                  {isSelected && (
                    <Check className={`h-4 w-4 ${checkColor}`} />
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