// Simple Node.js script to test WebSocket connection
const WebSocket = require('ws');

// Use the production API URL
const API_URL = 'https://ShriramS008-greenops-advisor-api.hf.space';
const WS_URL = API_URL.replace('http', 'ws') + '/ws/metrics';

console.log(`Testing WebSocket connection to: ${WS_URL}`);

const ws = new WebSocket(WS_URL);

ws.on('open', function open() {
  console.log('WebSocket connection established');
  
  // Send a collect message to trigger metrics collection
  ws.send('collect');
  console.log('Sent collect message');
});

ws.on('message', function incoming(data) {
  console.log('Received message:', data.toString());
  
  try {
    const jsonData = JSON.parse(data.toString());
    if (jsonData.type === 'metrics_update') {
      console.log('✅ Successfully received metrics update');
      console.log('Workloads processed:', jsonData.data.workloads_processed);
      console.log('Opportunities found:', jsonData.data.opportunities_found);
      console.log('Active connections:', jsonData.data.active_connections);
      
      // Close the connection after receiving metrics
      ws.close();
    } else {
      console.log('Received other message type:', jsonData.type);
    }
  } catch (error) {
    console.log('Received non-JSON message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('WebSocket connection closed');
});