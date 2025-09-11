import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  "data-testid"?: string;
}

type ColorMode = "hex" | "rgb";

export function ColorPicker({ value, onChange, className, placeholder = "#000000", "data-testid": testId }: ColorPickerProps) {
  const [mode, setMode] = useState<ColorMode>("hex");
  const [hexValue, setHexValue] = useState(value || "#000000");
  const [rgbValue, setRgbValue] = useState({ r: 0, g: 0, b: 0 });
  const [isOpen, setIsOpen] = useState(false);

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Convert RGB to hex
  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  // Update RGB when hex changes
  useEffect(() => {
    if (hexValue) {
      setRgbValue(hexToRgb(hexValue));
    }
  }, [hexValue]);

  // Update component when external value changes
  useEffect(() => {
    if (value && value !== hexValue) {
      setHexValue(value);
    }
  }, [value]);

  const handleHexChange = (newHex: string) => {
    // Allow typing # and partial hex values
    if (newHex === "" || /^#[0-9A-Fa-f]{0,6}$/.test(newHex)) {
      setHexValue(newHex);
      if (newHex.length === 7) { // Complete hex value
        onChange(newHex);
      }
    }
  };

  const handleRgbChange = (component: 'r' | 'g' | 'b', newValue: string) => {
    const numValue = Math.max(0, Math.min(255, parseInt(newValue) || 0));
    const newRgb = { ...rgbValue, [component]: numValue };
    setRgbValue(newRgb);
    const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    setHexValue(newHex);
    onChange(newHex);
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setHexValue(newColor);
    onChange(newColor);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Color preview */}
      <div 
        className="w-10 h-10 rounded border border-border" 
        style={{ backgroundColor: hexValue }}
        data-testid={testId ? `${testId}-preview` : undefined}
      />
      
      {/* Popover for detailed color picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="flex-1 justify-start"
            data-testid={testId ? `${testId}-trigger` : undefined}
          >
            {hexValue || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" data-testid={testId ? `${testId}-popover` : undefined}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Color Input Mode</Label>
              <Select value={mode} onValueChange={(value: ColorMode) => setMode(value)}>
                <SelectTrigger data-testid={testId ? `${testId}-mode-select` : undefined}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hex">Hex</SelectItem>
                  <SelectItem value="rgb">RGB</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Visual color picker */}
            <div className="space-y-2">
              <Label>Visual Picker</Label>
              <input
                type="color"
                value={hexValue}
                onChange={handleColorInputChange}
                className="w-full h-10 rounded border"
                data-testid={testId ? `${testId}-visual` : undefined}
              />
            </div>

            {mode === "hex" && (
              <div className="space-y-2">
                <Label>Hex Value</Label>
                <Input
                  value={hexValue}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="#000000"
                  className="font-mono"
                  data-testid={testId ? `${testId}-hex-input` : undefined}
                />
              </div>
            )}

            {mode === "rgb" && (
              <div className="space-y-2">
                <Label>RGB Values</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">R</Label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={rgbValue.r}
                      onChange={(e) => handleRgbChange('r', e.target.value)}
                      data-testid={testId ? `${testId}-rgb-r` : undefined}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">G</Label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={rgbValue.g}
                      onChange={(e) => handleRgbChange('g', e.target.value)}
                      data-testid={testId ? `${testId}-rgb-g` : undefined}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">B</Label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={rgbValue.b}
                      onChange={(e) => handleRgbChange('b', e.target.value)}
                      data-testid={testId ? `${testId}-rgb-b` : undefined}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={() => setIsOpen(false)} 
              className="w-full"
              data-testid={testId ? `${testId}-close` : undefined}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}