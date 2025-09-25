/**
 * Framework Detection and Processing System
 * Detects and processes React, Vue, Angular, and other framework code
 */

export type FrameworkType = 'html' | 'react' | 'vue' | 'angular' | 'svelte' | 'preact' | 'alpine' | 'vanilla-js';

export interface FrameworkInfo {
  type: FrameworkType;
  needsCompilation: boolean;
  cdnLinks?: string[];
  wrapperTemplate?: string;
}

/**
 * Detect which framework the code is using
 */
export function detectFramework(code: string): FrameworkInfo {
  const trimmedCode = code.trim();
  
  // Check for React/JSX
  if (
    trimmedCode.includes('import React') ||
    trimmedCode.includes('from "react"') ||
    trimmedCode.includes("from 'react'") ||
    trimmedCode.includes('React.createElement') ||
    trimmedCode.includes('ReactDOM.render') ||
    trimmedCode.includes('ReactDOM.createRoot') ||
    /<[A-Z]\w+/.test(trimmedCode) || // JSX components
    /const.*=.*\(.*\).*=>.*</.test(trimmedCode) || // Arrow function components
    /function\s+\w+\s*\(.*\).*{[\s\S]*return[\s\S]*</.test(trimmedCode) // Function components
  ) {
    return {
      type: 'react',
      needsCompilation: true,
      cdnLinks: [
        'https://unpkg.com/react@18/umd/react.production.min.js',
        'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
        'https://unpkg.com/@babel/standalone/babel.min.js'
      ]
    };
  }
  
  // Check for Vue
  if (
    trimmedCode.includes('new Vue') ||
    trimmedCode.includes('Vue.createApp') ||
    trimmedCode.includes('createApp') ||
    trimmedCode.includes('v-model') ||
    trimmedCode.includes('v-if') ||
    trimmedCode.includes('v-for') ||
    trimmedCode.includes('@click') ||
    /<template>/.test(trimmedCode) ||
    /export default {[\s\S]*data\s*\(\)/.test(trimmedCode)
  ) {
    return {
      type: 'vue',
      needsCompilation: true,
      cdnLinks: [
        'https://unpkg.com/vue@3/dist/vue.global.js'
      ]
    };
  }
  
  // Check for Angular
  if (
    trimmedCode.includes('@Component') ||
    trimmedCode.includes('@NgModule') ||
    trimmedCode.includes('angular.module') ||
    trimmedCode.includes('ng-app') ||
    trimmedCode.includes('ng-controller') ||
    trimmedCode.includes('*ngFor') ||
    trimmedCode.includes('*ngIf') ||
    trimmedCode.includes('[(ngModel)]')
  ) {
    return {
      type: 'angular',
      needsCompilation: true,
      cdnLinks: [
        'https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js'
      ]
    };
  }
  
  // Check for Svelte
  if (
    trimmedCode.includes('export let') ||
    trimmedCode.includes('$:') ||
    /<script>[\s\S]*<\/script>[\s\S]*<style>/.test(trimmedCode)
  ) {
    return {
      type: 'svelte',
      needsCompilation: true
    };
  }
  
  // Check for Alpine.js
  if (
    trimmedCode.includes('x-data') ||
    trimmedCode.includes('x-show') ||
    trimmedCode.includes('x-if') ||
    trimmedCode.includes('@click') ||
    trimmedCode.includes('Alpine.')
  ) {
    return {
      type: 'alpine',
      needsCompilation: false,
      cdnLinks: [
        'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js'
      ]
    };
  }
  
  // Check if it's already complete HTML
  if (trimmedCode.includes('<!DOCTYPE html') || trimmedCode.includes('<html')) {
    return {
      type: 'html',
      needsCompilation: false
    };
  }
  
  // Default to vanilla JS
  return {
    type: 'vanilla-js',
    needsCompilation: false
  };
}
