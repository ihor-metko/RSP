#!/usr/bin/env node

/**
 * Socket.IO Integration Test
 * 
 * This script tests the Socket.IO implementation by:
 * 1. Connecting to the server
 * 2. Subscribing to a club room
 * 3. Verifying event handlers
 * 4. Testing reconnection
 * 
 * Usage:
 *   1. Start the server: npm run dev (or npm start)
 *   2. Run this test: node test-socket-io.js
 * 
 * Environment:
 *   SOCKET_URL - Override default socket URL (default: http://localhost:3000)
 */

const io = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';
const SOCKET_PATH = '/api/socket';
const TEST_CLUB_ID = 'test-club-' + Date.now();

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type] || ''}${message}${reset}`);
}

function assert(condition, testName) {
  testsRun++;
  if (condition) {
    testsPassed++;
    log(`✓ ${testName}`, 'success');
    return true;
  } else {
    testsFailed++;
    log(`✗ ${testName}`, 'error');
    return false;
  }
}

async function runTests() {
  log('\n=== Socket.IO Integration Test ===\n', 'info');
  log(`Connecting to: ${SOCKET_URL}${SOCKET_PATH}\n`, 'info');

  return new Promise((resolve) => {
    // State variables for test flow
    let reconnected = false;
    let initialConnectionComplete = false;

    const socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 5000,
    });

    // Test 1: Connection
    const connectTimeout = setTimeout(() => {
      assert(false, 'Connection within timeout');
      cleanup();
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(connectTimeout);
      
      // First connection - run initial tests
      if (!initialConnectionComplete) {
        assert(true, 'Socket.IO connection established');
        assert(socket.id !== undefined, 'Socket ID assigned');
        assert(socket.connected === true, 'Socket connected state');
        
        log(`\nSocket ID: ${socket.id}\n`, 'info');

        // Test 2: Room subscription
        log('Testing room subscription...', 'info');
        socket.emit('subscribe:club:bookings', TEST_CLUB_ID);
        initialConnectionComplete = true;
        return;
      }
      
      // This is the reconnection after intentional disconnect
      if (!reconnected) {
        reconnected = true;
        assert(true, 'Reconnection successful');
        cleanup();
      }
    });

    socket.on('subscribed', (data) => {
      assert(data !== undefined, 'Subscription confirmation received');
      assert(data.clubId === TEST_CLUB_ID, 'Club ID matches in subscription');
      assert(data.room === `club:${TEST_CLUB_ID}:bookings`, 'Room name correct');
      
      log(`\nSubscribed to room: ${data.room}\n`, 'info');

      // Test 3: Room unsubscription
      log('Testing room unsubscription...', 'info');
      socket.emit('unsubscribe:club:bookings', TEST_CLUB_ID);
    });

    socket.on('unsubscribed', (data) => {
      assert(data !== undefined, 'Unsubscription confirmation received');
      assert(data.clubId === TEST_CLUB_ID, 'Club ID matches in unsubscription');
      
      log(`\nUnsubscribed from room: ${data.room}\n`, 'info');

      // Test 4: Reconnection
      log('Testing reconnection...', 'info');
      socket.disconnect();
      
      setTimeout(() => {
        socket.connect();
      }, 1000);
    });

    socket.on('disconnect', (reason) => {
      if (testsRun === 0) {
        assert(false, `Unexpected disconnect: ${reason}`);
        cleanup();
      }
    });

    socket.on('connect_error', (error) => {
      assert(false, `Connection error: ${error.message}`);
      cleanup();
    });

    function cleanup() {
      log('\n=== Test Results ===\n', 'info');
      log(`Total tests: ${testsRun}`, 'info');
      log(`Passed: ${testsPassed}`, 'success');
      if (testsFailed > 0) {
        log(`Failed: ${testsFailed}`, 'error');
      }
      
      const percentage = testsRun > 0 ? ((testsPassed / testsRun) * 100) : 0;
      const percentageStr = percentage.toFixed(1);
      log(`\nSuccess rate: ${percentageStr}%\n`, percentage >= 100 ? 'success' : 'warning');

      socket.disconnect();
      
      if (testsFailed === 0 && testsPassed > 0) {
        log('✓ All tests passed!\n', 'success');
        process.exit(0);
      } else {
        log('✗ Some tests failed\n', 'error');
        process.exit(1);
      }
    }

    // Overall timeout
    setTimeout(() => {
      if (!reconnected) {
        log('\n⚠ Test timeout - not all tests completed', 'warning');
        cleanup();
      }
    }, 15000);
  });
}

// Run the tests
runTests().catch((error) => {
  log(`\nTest runner error: ${error.message}\n`, 'error');
  process.exit(1);
});
