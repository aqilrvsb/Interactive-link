/**
 * Framework Support System
 * Main export file for framework detection and processing
 */

export { 
  detectFramework, 
  type FrameworkType, 
  type FrameworkInfo 
} from './frameworkDetector';

export { 
  processFrameworkCode, 
  getFrameworkTemplate 
} from './frameworkProcessor';

// Quick helper to check if code needs processing
export function needsFrameworkProcessing(code: string): boolean {
  const { needsCompilation } = detectFramework(code);
  return needsCompilation;
}

// Get human-readable framework name
export function getFrameworkName(type: FrameworkType): string {
  const names: Record<FrameworkType, string> = {
    'html': 'HTML',
    'react': 'React',
    'vue': 'Vue',
    'angular': 'Angular',
    'svelte': 'Svelte',
    'preact': 'Preact',
    'alpine': 'Alpine.js',
    'vanilla-js': 'JavaScript'
  };
  return names[type] || 'Unknown';
}
