import React, { useState, useEffect } from 'react';
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

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [color, setColor] = useState(value || '#000000');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Update internal state when value prop changes
    if (value) {
      setColor(value);
    }
  }, [value]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setColor(newColor);
    onChange(newColor);
  };

  const handlePaletteColorClick = (paletteColor: string) => {
    setColor(paletteColor);
    onChange(paletteColor);
  };

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
            <span className={color === '#FFFFFF' || color === '#FFFF' || color === '#FFF' || color === '#ffffff' ? 'text-black' : 'text-white'}>
              {color}
            </span>
          </div>
          <Paintbrush className={`h-4 w-4 ${color === '#FFFFFF' || color === '#FFFF' || color === '#FFF' || color === '#ffffff' ? 'text-black' : 'text-white'}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <div className="flex">
            <Input
              type="color"
              value={color}
              onChange={handleColorChange}
              className="h-10 p-1"
            />
            <Input
              type="text"
              value={color}
              onChange={handleColorChange}
              className="ml-2 h-10"
            />
          </div>
          <div className="grid grid-cols-6 gap-2">
            {colorPalette.map((paletteColor) => (
              <button
                key={paletteColor}
                className="h-8 w-8 rounded-md border flex items-center justify-center"
                style={{ backgroundColor: paletteColor }}
                onClick={() => handlePaletteColorClick(paletteColor)}
              >
                {color.toLowerCase() === paletteColor.toLowerCase() && (
                  <Check className={`h-4 w-4 ${paletteColor === '#FFFFFF' || paletteColor === '#FFF' ? 'text-black' : 'text-white'}`} />
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}