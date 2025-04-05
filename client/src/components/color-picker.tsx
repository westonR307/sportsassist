import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  try {
    // Default to false for invalid colors
    if (!colorHex || typeof colorHex !== 'string') return false;
    if (colorHex.length < 4) return false;
    
    // For simple #FFF or #FFFFFF detection
    const normalizedColor = colorHex.toLowerCase();
    if (normalizedColor === '#fff' || normalizedColor === '#ffffff') return true;
    
    // For proper calculation of other colors
    // Standardize the hex format
    let hex = normalizedColor.replace('#', '');
    
    // Handle shorthand hex format (#RGB instead of #RRGGBB)
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Validate hex format
    if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
    
    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate luminance - standard formula
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
  } catch (error) {
    console.error('Error calculating color brightness:', error);
    return false; // Default to dark if there's an error
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

  // Validate hex color
  const isValidHexColor = (color: string): boolean => {
    try {
      // Ensure color is a string
      if (!color || typeof color !== 'string') return false;
      
      // Standard validation regex for hex colors
      return /^#([0-9A-F]{3}){1,2}$/i.test(color);
    } catch (error) {
      console.error('Error validating hex color:', error);
      return false;
    }
  };

  // Handle manual color input changes
  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e || !e.target) return;
      const newColor = e.target.value || '';
      
      // For color input type, always valid (browser validates this)
      if (e.target.type === 'color') {
        setColor(newColor);
        onChange(newColor);
        return;
      }
      
      // For text input, validate hex format
      if (newColor.startsWith('#') && isValidHexColor(newColor)) {
        setColor(newColor);
        onChange(newColor);
      } else if (newColor.startsWith('#')) {
        // Just update local state but don't propagate invalid colors
        setColor(newColor);
      } else if (newColor === '') {
        // Allow clearing the input, reset to default black
        const defaultColor = '#000000';
        setColor(defaultColor);
        onChange(defaultColor);
      } else if (!newColor.startsWith('#')) {
        // Add # prefix if missing
        const updatedColor = `#${newColor}`;
        if (isValidHexColor(updatedColor)) {
          setColor(updatedColor);
          onChange(updatedColor);
        } else {
          // Update local state but don't propagate invalid
          setColor(updatedColor);
        }
      }
    } catch (error) {
      console.error('Error handling color change:', error);
      // On error, reset to a safe default color
      const fallbackColor = '#000000';
      setColor(fallbackColor);
      onChange(fallbackColor);
    }
  }, [onChange, isValidHexColor]);

  // Handle palette color selection
  const handlePaletteColorClick = useCallback((paletteColor: string) => {
    try {
      if (!paletteColor) return;
      
      // Always validate the palette color before setting it
      if (isValidHexColor(paletteColor)) {
        setColor(paletteColor);
        onChange(paletteColor);
      } else {
        console.warn('Invalid color in palette:', paletteColor);
      }
    } catch (error) {
      console.error('Error handling palette color selection:', error);
      // Don't change the color on error
    }
  }, [onChange, isValidHexColor]);

  // Text color for current selection - use try/catch for safety
  const textColorClass = useMemo(() => {
    try {
      if (!color) return 'text-black';
      return getTextClass(color);
    } catch (error) {
      console.error('Error determining text color class:', error);
      return 'text-black'; // Safe default
    }
  }, [color, getTextClass]);

  // Apply defensive programming to color value for inline styles
  const safeBackgroundColor = useMemo(() => {
    try {
      if (!color) return '#ffffff';
      return isValidHexColor(color) ? color : '#ffffff';
    } catch (error) {
      console.error('Error validating color for style:', error);
      return '#ffffff'; // Safe default
    }
  }, [color, isValidHexColor]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between border-input h-10"
          style={{ backgroundColor: safeBackgroundColor }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="h-5 w-5 rounded border"
              style={{ backgroundColor: safeBackgroundColor }}
            />
            <span className={textColorClass}>
              {color || '#000000'}
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
            {Array.isArray(colorPalette) ? colorPalette.map((paletteColor) => {
              try {
                if (!paletteColor) return null;
                
                // Safely compare colors with defensive checks
                const isSelected = color && paletteColor && 
                  color.toLowerCase() === paletteColor.toLowerCase();
                
                // Get text class with error handling  
                const buttonTextClass = (() => {
                  try {
                    return getTextClass(paletteColor);
                  } catch (error) {
                    console.error('Error getting text class for palette color:', error);
                    return 'text-black'; 
                  }
                })();
                
                return (
                  <button
                    key={paletteColor || Math.random().toString()}
                    type="button"
                    className="h-8 w-8 rounded-md border flex items-center justify-center"
                    style={{ 
                      backgroundColor: isValidHexColor(paletteColor) ? paletteColor : '#FFFFFF'
                    }}
                    onClick={() => handlePaletteColorClick(paletteColor)}
                  >
                    {isSelected && (
                      <Check className={`h-4 w-4 ${buttonTextClass}`} />
                    )}
                  </button>
                );
              } catch (error) {
                console.error('Error rendering palette color:', error);
                return null; // Skip rendering this item on error
              }
            }) : (
              // Fallback if colorPalette is not an array
              <div className="col-span-6 p-2 text-center text-sm text-muted-foreground">
                Color palette unavailable
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}