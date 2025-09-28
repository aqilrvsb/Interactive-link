// Test all frameworks programmatically
import { processFrameworkCode } from './frameworkProcessor';
import { detectFramework } from './frameworkDetector';

const testCases = [
  {
    name: 'React with Hooks',
    code: `function App() {
      const [count, setCount] = React.useState(0);
      return (
        <div>
          <h1>React Test</h1>
          <p>Count: {count}</p>
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>
      );
    }`
  },
  {
    name: 'Vue 3 Composition',
    code: `<div id="app">
      <h1>{{ title }}</h1>
      <button @click="count++">Count: {{ count }}</button>
    </div>
    <script>
    const { createApp } = Vue;
    createApp({
      data() {
        return { title: 'Vue Test', count: 0 }
      }
    }).mount('#app');
    </script>`
  },
  {
    name: 'Angular/AngularJS',
    code: `<div ng-app="testApp" ng-controller="MainCtrl">
      <h1>{{ title }}</h1>
      <button ng-click="increment()">Count: {{ count }}</button>
    </div>
    <script>
    angular.module('testApp', [])
      .controller('MainCtrl', function($scope) {
        $scope.title = 'Angular Test';
        $scope.count = 0;
        $scope.increment = function() { $scope.count++; };
      });
    </script>`
  },
  {
    name: 'Alpine.js',
    code: `<div x-data="{ count: 0, title: 'Alpine Test' }">
      <h1 x-text="title"></h1>
      <button @click="count++">Count: <span x-text="count"></span></button>
    </div>`
  }
];

export function runFrameworkTests() {
  const results = [];
  
  testCases.forEach(test => {
    console.log(`Testing: ${test.name}`);
    
    // Detect framework
    const detected = detectFramework(test.code);
    console.log(`  Detected as: ${detected.type}`);
    
    // Process code
    const processed = processFrameworkCode(test.code);
    
    // Check if processing added necessary CDN links
    const hasRequiredCDN = {
      'react': processed.includes('unpkg.com/react'),
      'vue': processed.includes('vue.global.js') || processed.includes('vue@3'),
      'angular': processed.includes('angular.min.js'),
      'alpine': processed.includes('alpinejs')
    };
    
    const frameworkType = detected.type === 'vanilla-js' ? 'angular' : detected.type;
    const cdnIncluded = hasRequiredCDN[frameworkType] || false;
    
    results.push({
      name: test.name,
      detected: detected.type,
      cdnIncluded,
      success: cdnIncluded && processed.includes('<!DOCTYPE')
    });
    
    console.log(`  CDN Included: ${cdnIncluded}`);
    console.log(`  Success: ${results[results.length - 1].success}\n`);
  });
  
  return results;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runFrameworkTests = runFrameworkTests;
}