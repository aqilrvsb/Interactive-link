/**
 * Framework Code Processor
 * Converts React, Vue, Angular code to browser-executable HTML
 */

import { FrameworkType, detectFramework } from './frameworkDetector';

/**
 * Process React/JSX code to make it browser-executable
 */
function processReactCode(code: string): string {
  // Check if it's already a complete HTML document
  if (code.includes('<!DOCTYPE') || code.includes('<html')) {
    // Check if it already has React CDN links
    if (!code.includes('unpkg.com/react')) {
      // Insert React CDN links before </head>
      const headEndIndex = code.indexOf('</head>');
      if (headEndIndex !== -1) {
        const reactCDN = `
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`;
        code = code.slice(0, headEndIndex) + reactCDN + code.slice(headEndIndex);
      }
    }
    return code;
  }
  
  // Extract component code
  let componentCode = code;
  
  // Check if code has imports (ES6 modules)
  const hasImports = code.includes('import React') || code.includes('import {');
  
  // Convert ES6 imports to global access
  if (hasImports) {
    componentCode = componentCode
      .replace(/import\s+React(?:,\s*{[^}]+})?\s+from\s+['"]react['"]/g, '')
      .replace(/import\s+ReactDOM\s+from\s+['"]react-dom['"]/g, '')
      .replace(/import\s+{([^}]+)}\s+from\s+['"]react['"]/g, 'const {$1} = React')
      .replace(/export\s+default\s+/g, '');
  }
  
  // Build complete HTML with React
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        ${componentCode}
        
        // Auto-detect the main component and render it
        ${!componentCode.includes('ReactDOM.render') && !componentCode.includes('ReactDOM.createRoot') ? `
        // Find the main component (first function that returns JSX)
        const componentNames = Object.keys(window).filter(key => {
            try {
                return typeof window[key] === 'function' && 
                       key[0] === key[0].toUpperCase() &&
                       key !== 'React' && key !== 'ReactDOM';
            } catch(e) { return false; }
        });
        
        if (componentNames.length > 0 || typeof App !== 'undefined') {
            const MainComponent = typeof App !== 'undefined' ? App : window[componentNames[0]];
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(React.createElement(MainComponent));
        }` : ''}
    </script>
</body>
</html>`;
}
/**
 * Process Vue code to make it browser-executable
 */
function processVueCode(code: string): string {
  // Check if it's already complete HTML
  if (code.includes('<!DOCTYPE') || code.includes('<html')) {
    if (!code.includes('vue.global.js') && !code.includes('vue.min.js')) {
      const headEndIndex = code.indexOf('</head>');
      if (headEndIndex !== -1) {
        const vueCDN = `\n    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>`;
        code = code.slice(0, headEndIndex) + vueCDN + code.slice(headEndIndex);
      }
    }
    return code;
  }
  
  // Check if it's a Vue SFC (Single File Component)
  const isSFC = code.includes('<template>') && code.includes('<script>');
  
  if (isSFC) {
    // Extract template, script, and style sections
    const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/);
    const scriptMatch = code.match(/<script>([\s\S]*?)<\/script>/);
    const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    
    const template = templateMatch ? templateMatch[1].trim() : '<div>{{ message }}</div>';
    const script = scriptMatch ? scriptMatch[1].trim() : 'export default { data() { return { message: "Hello Vue!" } } }';
    const style = styleMatch ? styleMatch[1].trim() : '';
    
    // Convert to Options API format
    const componentCode = script.replace('export default', 'const AppComponent =');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue App</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        ${style}
    </style>
</head>
<body>
    <div id="app">${template}</div>
    <script>
        const { createApp } = Vue;
        ${componentCode}
        createApp(AppComponent).mount('#app');
    </script>
</body>
</html>`;
  }  
  // Standard Vue 3 composition
  let vueCode = code;
  
  // Remove ES6 imports
  vueCode = vueCode
    .replace(/import\s+{[^}]+}\s+from\s+['"]vue['"]/g, '')
    .replace(/export\s+default\s+/g, '');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue App</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        #app { padding: 20px; }
    </style>
</head>
<body>
    <div id="app">
        <h1>{{ title || 'Vue App' }}</h1>
        <div v-if="message">{{ message }}</div>
    </div>
    <script>
        const { createApp, ref, reactive, computed, watch, onMounted } = Vue;
        
        ${vueCode}
        
        // Auto-create app if not already done
        ${!vueCode.includes('createApp') ? `
        createApp({
            setup() {
                const title = ref('Vue App');
                const message = ref('Welcome to Vue 3!');
                return { title, message };
            }
        }).mount('#app');` : ''}
    </script>
</body>
</html>`;
}
/**
 * Process Angular code (AngularJS 1.x for browser compatibility)
 */
function processAngularCode(code: string): string {
  if (code.includes('<!DOCTYPE') || code.includes('<html')) {
    if (!code.includes('angular.min.js')) {
      const headEndIndex = code.indexOf('</head>');
      if (headEndIndex !== -1) {
        const angularCDN = `\n    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>`;
        code = code.slice(0, headEndIndex) + angularCDN + code.slice(headEndIndex);
      }
    }
    return code;
  }
  
  // For modern Angular (TypeScript), we'll convert to AngularJS 1.x
  let appCode = code;
  
  // Remove TypeScript decorators and convert to AngularJS
  if (code.includes('@Component') || code.includes('@NgModule')) {
    // Extract template from @Component
    const templateMatch = code.match(/template:\s*['`]([^'`]+)['`]/);
    const template = templateMatch ? templateMatch[1] : '<h1>{{ title }}</h1>';
    
    // Extract component class properties
    const classMatch = code.match(/export\s+class\s+(\w+)(?:Component)?\s*{([^}]*)}/);
    const className = classMatch ? classMatch[1] : 'App';
    const classBody = classMatch ? classMatch[2] : '';
    
    // Convert to AngularJS controller
    appCode = `
        angular.module('myApp', [])
            .controller('MainCtrl', function($scope) {
                $scope.title = 'Angular App';
                ${classBody.replace(/^\s*(\w+)\s*=\s*(.+);/gm, '$scope.$1 = $2;')}
            });
    `;
    
    return `<!DOCTYPE html>
<html ng-app="myApp">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Angular App</title>
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; padding: 20px; }
    </style>
</head>
<body ng-controller="MainCtrl">
    ${template}
    <script>${appCode}</script>
</body>
</html>`;
  }  
  // Standard AngularJS 1.x code
  return `<!DOCTYPE html>
<html ng-app="myApp">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Angular App</title>
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; padding: 20px; }
    </style>
</head>
<body ng-controller="MainCtrl">
    <h1>{{ title }}</h1>
    <p>{{ message }}</p>
    <script>
        ${appCode}
        
        // Auto-create app if not exists
        ${!appCode.includes('angular.module') ? `
        angular.module('myApp', [])
            .controller('MainCtrl', function($scope) {
                $scope.title = 'Angular App';
                $scope.message = 'Welcome to AngularJS!';
            });` : ''}
    </script>
</body>
</html>`;
}

/**
 * Wrap vanilla JavaScript in HTML structure
 */
function wrapVanillaJS(code: string): string {
  // Check if it's already HTML
  if (code.includes('<!DOCTYPE') || code.includes('<html') || code.includes('<body')) {
    return code;
  }
  
  // Check if it contains HTML elements
  const hasHTMLElements = /<\w+[^>]*>/.test(code);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JavaScript App</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
    </style>
</head>
<body>
    ${hasHTMLElements ? code : '<div id="app"></div>'}
    ${!hasHTMLElements ? `<script>${code}</script>` : ''}
</body>
</html>`;
}
/**
 * Main processing function that handles all framework types
 */
export function processFrameworkCode(code: string): string {
  // Skip processing if empty
  if (!code || !code.trim()) {
    return code;
  }
  
  // Detect the framework
  const frameworkInfo = detectFramework(code);
  
  // Process based on framework type
  switch (frameworkInfo.type) {
    case 'react':
      return processReactCode(code);
      
    case 'vue':
      return processVueCode(code);
      
    case 'angular':
      return processAngularCode(code);
      
    case 'html':
      // Already HTML, return as-is
      return code;
      
    case 'alpine':
      // Alpine.js works directly in browser
      if (!code.includes('<!DOCTYPE')) {
        return wrapAlpineJS(code);
      }
      return code;
      
    case 'vanilla-js':
    default:
      return wrapVanillaJS(code);
  }
}

/**
 * Wrap Alpine.js code in HTML structure
 */
function wrapAlpineJS(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alpine.js App</title>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
    </style>
</head>
<body>
    ${code}
</body>
</html>`;
}

/**
 * Get template code for a specific framework
 */
export function getFrameworkTemplate(framework: FrameworkType): string {
  switch (framework) {
    case 'react':
      return REACT_TEMPLATE;
    case 'vue':
      return VUE_TEMPLATE;
    case 'angular':
      return ANGULAR_TEMPLATE;
    case 'alpine':
      return ALPINE_TEMPLATE;
    default:
      return DEFAULT_HTML_TEMPLATE;
  }
}
// Framework Templates
const REACT_TEMPLATE = `import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>React Counter App</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
    </div>
  );
}

// Component will be auto-rendered`;

const VUE_TEMPLATE = `<template>
  <div>
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      title: 'Vue Counter App',
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++;
    },
    decrement() {
      this.count--;
    }
  }
}
</script>

<style>
div { padding: 20px; font-family: Arial; }
button { margin: 5px; }
</style>`;
const ANGULAR_TEMPLATE = `@Component({
  selector: 'app-root',
  template: \`
    <div style="padding: 20px; font-family: Arial;">
      <h1>{{ title }}</h1>
      <p>Count: {{ count }}</p>
      <button (click)="increment()">Increment</button>
      <button (click)="decrement()">Decrement</button>
    </div>
  \`
})
export class AppComponent {
  title = 'Angular Counter App';
  count = 0;
  
  increment() {
    this.count++;
  }
  
  decrement() {
    this.count--;
  }
}`;

const ALPINE_TEMPLATE = `<div x-data="{ count: 0, title: 'Alpine.js Counter App' }" style="padding: 20px; font-family: Arial;">
    <h1 x-text="title"></h1>
    <p>Count: <span x-text="count"></span></p>
    <button @click="count++" style="margin: 5px;">Increment</button>
    <button @click="count--" style="margin: 5px;">Decrement</button>
</div>`;

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Website!</h1>
        <p>Start coding with React, Vue, Angular, or plain HTML/JS!</p>
        <button onclick="alert('Hello World!')">Click Me!</button>
    </div>
</body>
</html>`;