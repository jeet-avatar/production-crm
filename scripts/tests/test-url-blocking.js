/**
 * Test URL Blocking
 * Tests that blocked domains are rejected by the application
 */

const { isUrlBlocked, validateUrl } = require('./dist/middleware/urlValidator');

console.log('🧪 Testing URL Blocking...\n');

// Test cases
const testCases = [
  { url: 'https://bedpage.com/video.mp4', shouldBlock: true },
  { url: 'https://www.bedpage.com/video.mp4', shouldBlock: true },
  { url: 'https://subdomain.bedpage.com/video.mp4', shouldBlock: true },
  { url: 'https://brandmonkz.com/video.mp4', shouldBlock: false },
  { url: 'https://youtube.com/video.mp4', shouldBlock: false },
  { url: 'https://vimeo.com/video.mp4', shouldBlock: false },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const isBlocked = isUrlBlocked(test.url);
  const expectation = test.shouldBlock ? 'BLOCKED' : 'ALLOWED';
  const result = isBlocked ? 'BLOCKED' : 'ALLOWED';
  const success = (isBlocked === test.shouldBlock);

  if (success) {
    console.log(`✅ Test ${index + 1}: ${test.url}`);
    console.log(`   Expected: ${expectation}, Got: ${result}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${test.url}`);
    console.log(`   Expected: ${expectation}, Got: ${result}`);
    failed++;
  }
  console.log('');
});

console.log('=====================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('=====================================\n');

if (failed === 0) {
  console.log('✅ All tests passed! URL blocking is working correctly.\n');
  console.log('Blocked domains:');
  console.log('  - bedpage.com');
  console.log('  - www.bedpage.com');
  console.log('  - *.bedpage.com (all subdomains)\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please check the configuration.\n');
  process.exit(1);
}
