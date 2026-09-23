import React, { useState } from 'react';
import { Slider } from "@rentify/shared/ui/slider";
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rentify/shared/ui/card";
import { Label } from "@rentify/shared/ui/label";
import { ChromePicker } from 'react-color';
import { RefreshCw, Eye } from 'lucide-react';

interface InteractiveDemoProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const InteractiveDemo = ({ selectedColor, onColorChange }: InteractiveDemoProps) => {
  const [fontSize, setFontSize] = useState(16);
  const [spacing, setSpacing] = useState(2);
  const [radius, setRadius] = useState(4);

  const resetDefaults = () => {
    setFontSize(16);
    setSpacing(2);
    setRadius(4);
    onColorChange('#2563eb');
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50/30 border-0 shadow-lg rounded-3xl overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          <Eye className="h-6 w-6 text-blue-600" />
          Live Customization
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Column */}
          <div className="space-y-6">
            {/* Color Picker */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-800">Primary Color</Label>
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white p-4">
                <ChromePicker
                  color={selectedColor}
                  onChangeComplete={(color) => onColorChange(color.hex)}
                  disableAlpha
                  styles={{
                    default: {
                      picker: { 
                        width: '100%',
                        boxShadow: 'none',
                        background: 'transparent',
                        borderRadius: '12px'
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Font Size Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold text-gray-800">Font Size</Label>
                <span className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  {fontSize}px
                </span>
              </div>
              <Slider
                value={[fontSize]}
                onValueChange={(value) => setFontSize(value[0])}
                min={12}
                max={24}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-gray-500 px-1">
                <span>12px</span>
                <span>18px</span>
                <span>24px</span>
              </div>
            </div>

            {/* Spacing Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold text-gray-800">Spacing</Label>
                <span className="text-sm font-medium bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  {spacing}rem
                </span>
              </div>
              <Slider
                value={[spacing]}
                onValueChange={(value) => setSpacing(value[0])}
                min={1}
                max={8}
                step={0.5}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-gray-500 px-1">
                <span>1rem</span>
                <span>4.5rem</span>
                <span>8rem</span>
              </div>
            </div>

            {/* Border Radius Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold text-gray-800">Border Radius</Label>
                <span className="text-sm font-medium bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                  {radius}px
                </span>
              </div>
              <Slider
                value={[radius]}
                onValueChange={(value) => setRadius(value[0])}
                min={0}
                max={16}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-gray-500 px-1">
                <span>0px</span>
                <span>8px</span>
                <span>16px</span>
              </div>
            </div>
          </div>

          {/* Preview Column */}
          <div className="space-y-6">
            <Label className="text-base font-semibold text-gray-800 block">Live Preview</Label>
            
            {/* Preview Element */}
            <div 
              className="h-64 rounded-2xl p-8 transition-all duration-300 ease-in-out flex items-center justify-center relative overflow-hidden group"
              style={{ 
                backgroundColor: selectedColor,
                borderRadius: `${radius}px`,
                padding: `${spacing * 0.5}rem`
              }}
            >
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white to-transparent"></div>
              
              <div className="text-center relative z-10">
                <h3 
                  className="text-white font-semibold mb-4 transition-all duration-300"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  Preview Element
                </h3>
                
                <div 
                  className="bg-white/20 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 border border-white/30"
                  style={{ 
                    borderRadius: `${Math.max(radius - 2, 0)}px`,
                    marginTop: `${spacing * 0.25}rem`
                  }}
                >
                  <span 
                    className="text-white/90 font-medium transition-all duration-300"
                    style={{ fontSize: `${Math.max(fontSize - 2, 12)}px` }}
                  >
                    Interactive Component
                  </span>
                </div>
              </div>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 rounded-2xl"></div>
            </div>

            {/* Preview Metrics */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600" style={{ color: selectedColor }}>
                  Aa
                </div>
                <div className="text-xs text-gray-600 mt-1">Font Size</div>
                <div className="text-sm font-semibold">{fontSize}px</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: selectedColor }}>
                  ⬌
                </div>
                <div className="text-xs text-gray-600 mt-1">Spacing</div>
                <div className="text-sm font-semibold">{spacing}rem</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: selectedColor }}>
                  ◐
                </div>
                <div className="text-xs text-gray-600 mt-1">Radius</div>
                <div className="text-sm font-semibold">{radius}px</div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={resetDefaults}
                className="rounded-xl gap-2 border-2 hover:shadow-lg transition-all duration-300"
              >
                <RefreshCw className="h-4 w-4" />
                Reset Defaults
              </Button>
            </div>
          </div>
        </div>

        {/* CSS Variables Display */}
        <div className="mt-8 p-4 bg-gray-900 rounded-2xl text-white font-mono text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-400 ml-2">CSS Variables</span>
          </div>
          <div className="space-y-1">
            <div><span className="text-purple-400">--primary-color:</span> <span className="text-green-400">{selectedColor}</span>;</div>
            <div><span className="text-purple-400">--font-size:</span> <span className="text-green-400">{fontSize}px</span>;</div>
            <div><span className="text-purple-400">--spacing:</span> <span className="text-green-400">{spacing}rem</span>;</div>
            <div><span className="text-purple-400">--border-radius:</span> <span className="text-green-400">{radius}px</span>;</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveDemo;