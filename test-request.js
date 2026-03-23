const http = require('http');

console.time('Homepage Request');
const req = http.get('http://localhost:5174/', (res) => {
  console.timeEnd('Homepage Request');
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Body length:', data.length);
    console.log('First 200 chars:', data.substring(0, 200));
  });
});

req.on('error', (err) => {
  console.timeEnd('Homepage Request');
  console.error('Error:', err.message);
});

req.setTimeout(30000, () => {
  console.log('Request timeout');
  req.destroy();
});
