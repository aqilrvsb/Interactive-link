import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFrameworkTemplate } from '@/utils/frameworks';
import { Code2, Zap, Package, Layers, FileCode, Triangle } from 'lucide-react';

interface FrameworkTemplatesProps {
  onSelectTemplate: (code: string) => void;
}

export const FrameworkTemplates: React.FC<FrameworkTemplatesProps> = ({ onSelectTemplate }) => {
  const templates = [
    {
      id: 'react',
      name: 'React',
      icon: <Zap className="h-4 w-4" />,
      description: 'Modern React with Hooks',
      color: 'text-blue-500'
    },
    {
      id: 'vue',
      name: 'Vue 3',
      icon: <Triangle className="h-4 w-4" />,
      description: 'Composition API',
      color: 'text-green-500'
    },
    {
      id: 'angular',
      name: 'Angular',
      icon: <Layers className="h-4 w-4" />,
      description: 'TypeScript components',
      color: 'text-red-500'
    },
    {
      id: 'alpine',
      name: 'Alpine.js',
      icon: <Package className="h-4 w-4" />,
      description: 'Lightweight reactive',
      color: 'text-purple-500'
    },
    {
      id: 'html',
      name: 'HTML5',
      icon: <FileCode className="h-4 w-4" />,
      description: 'Pure HTML/CSS/JS',
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 p-4">
      {templates.map((template) => (
        <Card 
          key={template.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onSelectTemplate(getFrameworkTemplate(template.id as any))}
        >
          <CardHeader className="p-3">
            <div className={`${template.color} mb-2`}>
              {template.icon}
            </div>
            <CardTitle className="text-sm">{template.name}</CardTitle>
            <CardDescription className="text-xs">
              {template.description}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};