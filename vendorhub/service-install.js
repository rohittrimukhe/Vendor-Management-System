// Windows Service installer using node-windows
// Run: node service-install.js
const path = require('path');

try {
  const Service = require('node-windows').Service;

  const svc = new Service({
    name: 'VendorHub',
    description: 'LRS VendorHub - Vendor Management System',
    script: path.join(__dirname, 'server', 'index.js'),
    nodeOptions: [],
    env: [
      { name: 'NODE_ENV', value: 'production' },
      { name: 'PORT', value: '8080' }
    ]
  });

  svc.on('install', function () {
    console.log('VendorHub service installed. Starting...');
    svc.start();
  });

  svc.on('start', function () {
    console.log('VendorHub service started on http://localhost:8080');
  });

  svc.on('error', function (err) {
    console.error('Service error:', err);
  });

  svc.install();
} catch (e) {
  // node-windows not available — fallback to direct start
  console.log('node-windows not found. Starting directly...');
  require('./server/index.js');
}
