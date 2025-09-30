import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface YearInputProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  className?: string;
}

export function YearInput({ value, onChange, className }: YearInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty input
    if (inputValue === '') {
      onChange(undefined);
      return;
    }
    
    // Parse as number and validate
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue) && numValue >= 1900 && numValue <= 2100) {
      onChange(numValue);
    }
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label htmlFor="tahun" className="text-sm font-medium text-gray-700">
        Tahun
      </Label>
      <Input
        id="tahun"
        type="number"
        min="1900"
        max="2100"
        value={value || ''}
        onChange={handleInputChange}
        placeholder="Contoh: 2024"
        className="w-full h-10 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
      />
    </div>
  );
}