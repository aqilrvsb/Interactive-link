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
  
  // Check if component uses JSX
  const hasJSX = /<[A-Za-z][^>]*>/.test(componentCode) || /<\/[A-Za-z]+>/.test(componentCode);
  
  // Build complete HTML with React
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.min.js"></script>
    ${hasJSX ? '<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>' : ''}
    <style>
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            padding: 20px;
        }
        button {
            margin: 5px;
            padding: 8px 16px;
            font-size: 16px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script ${hasJSX ? 'type="text/babel"' : 'type="text/javascript"'}>
        const { useState, useEffect, useRef, useCallback, useMemo } = React;
        
        ${componentCode}
        
        // Auto-render the component
        const root = ReactDOM.createRoot(document.getElementById('root'));
        
        // Try to find and render the main component
        if (typeof App !== 'undefined') {
            root.render(${hasJSX ? '<App />' : 'React.createElement(App)'});
        } else {
            // Look for any exported function component
            const functionNames = Object.keys(window).filter(key => 
                typeof window[key] === 'function' && 
                key[0] === key[0].toUpperCase() &&
                !['React', 'ReactDOM'].includes(key)
            );
            
            if (functionNames.length > 0) {
                const Component = window[functionNames[0]];
                root.render(${hasJSX ? '<Component />' : 'React.createElement(Component)'});
            } else {
                // Fallback: create a simple working component
                function DefaultApp() {
                    const [count, setCount] = useState(0);
                    return React.createElement('div', null,
                        React.createElement('h1', null, 'React App'),
                        React.createElement('p', null, 'Click the button below to test React is working'),
                        React.createElement('p', null, 'Count: ' + count),
                        React.createElement('button', { onClick: () => setCount(count + 1) }, 'Increment')
                    );
                }
                root.render(React.createElement(DefaultApp));
            }
        }
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
 * Process Angular code (Modern Angular with standalone scripts)
 */
function processAngularCode(code: string): string {
  if (code.includes('<!DOCTYPE') || code.includes('<html')) {
    if (!code.includes('angular.min.js') && !code.includes('@angular/')) {
      const headEndIndex = code.indexOf('</head>');
      if (headEndIndex !== -1) {
        // Use AngularJS for simpler compatibility
        const angularCDN = `\n    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>`;
        code = code.slice(0, headEndIndex) + angularCDN + code.slice(headEndIndex);
      }
    }
    return code;
  }
  
  // For modern Angular (TypeScript), convert to AngularJS 1.x
  let appCode = code;
  
  // Remove TypeScript decorators and convert to AngularJS
  if (code.includes('@Component') || code.includes('@NgModule')) {
    // Extract template from @Component
    const templateMatch = code.match(/template:\s*`([^`]+)`/);
    const template = templateMatch ? templateMatch[1] : '<h1>{{ title }}</h1><p>Count: {{ count }}</p>';
    
    // Extract component class properties and methods
    const classMatch = code.match(/export\s+class\s+(\w+)(?:Component)?\s*{([^}]*)}/);
    const className = classMatch ? classMatch[1] : 'App';
    const classBody = classMatch ? classMatch[2] : '';
    
    // Parse properties and methods
    const properties = [];
    const methods = [];
    
    // Extract properties (e.g., title = 'Angular Counter App')
    const propMatches = classBody.matchAll(/^\s*(\w+)\s*=\s*['"`]?([^;'"`]+)['"`]?;?/gm);
    for (const match of propMatches) {
      properties.push(`$scope.${match[1]} = '${match[2]}';`);
    }
    
    // Extract methods
    const methodMatches = classBody.matchAll(/^\s*(\w+)\s*\(\)\s*{([^}]*)}/gm);
    for (const match of methodMatches) {
      methods.push(`$scope.${match[1]} = function() {${match[2]}};`);
    }
    
    return `<!DOCTYPE html>
<html ng-app="myApp">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Angular App</title>
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; padding: 20px; }
        button { margin: 5px; padding: 8px 16px; font-size: 16px; cursor: pointer; }
    </style>
</head>
<body ng-controller="MainCtrl">
    ${template}
    <script>
        angular.module('myApp', [])
            .controller('MainCtrl', function($scope) {
                // Default values
                $scope.title = $scope.title || 'Angular Counter App';
                $scope.count = 0;
                
                ${properties.join('\n                ')}
                
                // Methods
                $scope.increment = function() {
                    $scope.count++;
                };
                
                $scope.decrement = function() {
                    $scope.count--;
                };
                
                ${methods.join('\n                ')}
            });
    </script>
</body>
</html>`;
  }  
  // Standard AngularJS 1.x code or simple Angular template
  if (code.includes('ng-app') || code.includes('ng-controller') || code.includes('angular.module')) {
    // If it already has the angular CDN and structure, just wrap it
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Angular App</title>
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; padding: 20px; }
        button { margin: 5px; padding: 8px 16px; font-size: 16px; cursor: pointer; }
    </style>
</head>
<body>
    ${code}
</body>
</html>`;
  }
  
  // Default Angular template if no specific Angular code detected
  return `<!DOCTYPE html>
<html ng-app="myApp">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Angular App</title>
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>
    <style>
        body { margin: 0; font-family: Arial, sans-serif; padding: 20px; }
        button { margin: 5px; padding: 8px 16px; font-size: 16px; cursor: pointer; }
    </style>
</head>
<body ng-controller="MainCtrl">
    <h1>{{ title }}</h1>
    <p>{{ message }}</p>
    <p>Count: {{ count }}</p>
    <button ng-click="count = count + 1">Increment</button>
    <button ng-click="count = count - 1">Decrement</button>
    <script>
        angular.module('myApp', [])
            .controller('MainCtrl', function($scope) {
                $scope.title = 'Angular App';
                $scope.message = 'Welcome to AngularJS!';
                $scope.count = 0;
            });
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
  // Check if code already has Alpine CDN
  const hasAlpineCDN = code.includes('alpinejs') || code.includes('Alpine');
  
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
    ${!hasAlpineCDN ? code : code.replace(/<script[^>]*alpinejs[^>]*><\/script>/gi, '')}
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
const REACT_TEMPLATE = `function App() {
  const [count, setCount] = React.useState(0);
  
  return React.createElement('div', 
    { style: { padding: '20px', fontFamily: 'Arial' } },
    React.createElement('h1', null, 'React Counter App'),
    React.createElement('p', null, 'Count: ' + count),
    React.createElement('button', 
      { onClick: () => setCount(count + 1), style: { marginRight: '10px' } }, 
      'Increment'
    ),
    React.createElement('button', 
      { onClick: () => setCount(count - 1) }, 
      'Decrement'
    )
  );
}`;

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
const ANGULAR_TEMPLATE = `<div ng-app="myApp" ng-controller="MainCtrl">
  <div style="padding: 20px; font-family: Arial;">
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
    <button ng-click="increment()">Increment</button>
    <button ng-click="decrement()">Decrement</button>
  </div>
</div>
<script>
angular.module('myApp', [])
  .controller('MainCtrl', function($scope) {
    $scope.title = 'Angular Counter App';
    $scope.count = 0;
    
    $scope.increment = function() {
      $scope.count++;
    };
    
    $scope.decrement = function() {
      $scope.count--;
    };
  });
</script>`;

const ALPINE_TEMPLATE = `<div x-data="{ count: 0, title: 'Alpine.js Counter App' }" style="padding: 20px; font-family: Arial;">
    <h1 x-text="title"></h1>
    <p>Count: <span x-text="count"></span></p>
    <button @click="count++" style="margin: 5px; padding: 8px 16px; cursor: pointer;">Increment</button>
    <button @click="count--" style="margin: 5px; padding: 8px 16px; cursor: pointer;">Decrement</button>
</div>

<!-- Alpine.js will be automatically included -->`;

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