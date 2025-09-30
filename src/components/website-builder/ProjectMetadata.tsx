import React from 'react';
import { Card } from '@/components/ui/card';
import { CategorySelector, KategoriType } from './CategorySelector';
import { YearInput } from './YearInput';

interface ProjectMetadataProps {
  kategori?: string;
  tahun?: number;
  onKategoriChange: (kategori: string) => void;
  onTahunChange: (tahun: number | undefined) => void;
  className?: string;
}

export function ProjectMetadata({
  kategori,
  tahun,
  onKategoriChange,
  onTahunChange,
  className
}: ProjectMetadataProps) {
  return (
    <Card className={`p-4 bg-white shadow-sm border border-gray-200 rounded-lg ${className || ''}`}>
      <div className="space-y-4">
        <div className="text-sm font-semibold text-gray-800 mb-3">
          Maklumat Projek
        </div>
        
        <CategorySelector
          value={kategori}
          onValueChange={onKategoriChange}
        />
        
        <YearInput
          value={tahun}
          onChange={onTahunChange}
        />
      </div>
    </Card>
  );
}

// Export types for use in other components
export type { KategoriType };