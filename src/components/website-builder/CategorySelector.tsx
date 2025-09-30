import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Category options as defined in the PRD
export const KATEGORI_OPTIONS = [
  'Matematik',
  'Sejarah',
  'Sains',
  'Bahasa Melayu',
  'Bahasa Inggeris',
  'Pendidikan Islam'
] as const;

export type KategoriType = typeof KATEGORI_OPTIONS[number];

interface CategorySelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function CategorySelector({ value, onValueChange, className }: CategorySelectorProps) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label htmlFor="kategori" className="text-sm font-medium text-gray-700">
        Kategori
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger 
          id="kategori"
          className="w-full h-10 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
        >
          <SelectValue placeholder="Pilih Kategori" />
        </SelectTrigger>
        <SelectContent>
          {KATEGORI_OPTIONS.map((kategori) => (
            <SelectItem key={kategori} value={kategori}>
              {kategori}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}