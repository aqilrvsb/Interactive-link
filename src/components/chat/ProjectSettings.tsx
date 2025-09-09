import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Settings, ChevronDown, ChevronUp, Save, Download, Loader2 } from 'lucide-react';

const AI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'llama-3-70b', label: 'Llama 3 70B' },
  { value: 'grok-1', label: 'Grok-1' },
];

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', extension: 'js' },
  { value: 'typescript', label: 'TypeScript', extension: 'ts' },
  { value: 'python', label: 'Python', extension: 'py' },
  { value: 'html', label: 'HTML', extension: 'html' },
  { value: 'css', label: 'CSS', extension: 'css' },
  { value: 'react', label: 'React', extension: 'jsx' },
];

interface ProjectSettingsData {
  title: string;
  description: string;
  language: string;
  ai_model: string;
}

interface ProjectSettingsProps {
  settings: ProjectSettingsData;
  onSettingsChange: (settings: ProjectSettingsData) => void;
  onSave: () => void;
  onDownload: () => void;
  saving?: boolean;
  isMobile?: boolean;
}

const ProjectSettings = ({ 
  settings, 
  onSettingsChange, 
  onSave, 
  onDownload,
  saving = false,
  isMobile = false
}: ProjectSettingsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateSetting = (key: keyof ProjectSettingsData, value: string) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const SettingsContent = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Project Title</Label>
        <Input
          id="title"
          value={settings.title}
          onChange={(e) => updateSetting('title', e.target.value)}
          placeholder="My Awesome Project"
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={settings.description}
          onChange={(e) => updateSetting('description', e.target.value)}
          placeholder="Project description..."
          rows={3}
        />
      </div>
      
      <div>
        <Label htmlFor="language">Language</Label>
        <Select 
          value={settings.language} 
          onValueChange={(value) => updateSetting('language', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="ai-model">AI Model</Label>
        <Select 
          value={settings.ai_model} 
          onValueChange={(value) => updateSetting('ai_model', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={onSave} disabled={saving} className="flex-1">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save
        </Button>
        <Button variant="outline" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Project Settings</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <SettingsContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="border-r bg-card w-80">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-4 h-auto border-b"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="font-medium">Project Settings</span>
            </div>
            {isExpanded ? 
              <ChevronUp className="h-4 w-4" /> : 
              <ChevronDown className="h-4 w-4" />
            }
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4">
            <SettingsContent />
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      {!isExpanded && (
        <div className="p-4 space-y-2 text-sm text-muted-foreground">
          <div><span className="font-medium">Language:</span> {LANGUAGES.find(l => l.value === settings.language)?.label}</div>
          <div><span className="font-medium">Model:</span> {AI_MODELS.find(m => m.value === settings.ai_model)?.label}</div>
        </div>
      )}
    </div>
  );
};

export default ProjectSettings;