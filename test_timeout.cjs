
const https = require('https');

async function testWithTimeout(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'dqjwzzdvfqfchnnspmnb.supabase.co',
            port: 443,
            path: path,
            method: 'GET',
            timeout: 5000,
            headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxand6emR2ZnFmY2hubnNwbW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDA5NzgsImV4cCI6MjA4NTgxNjk3OH0.7Z9XBalE0eWWQvoBtoQwjcXlnHeBFIZ73r4Y07Hnc3I',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxand6emR2ZnFmY2hubnNwbW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDA5NzgsImV4cCI6MjA4NTgxNjk3OH0.7Z9XBalE0eWWQvoBtoQwjcXlnHeBFIZ73r4Y07Hnc3I'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({ status: res.statusCode, data: data });
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out after 5s'));
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

async function run() {
    console.log('Testing /rest/v1/tenants...');
    try {
        const res = await testWithTimeout('/rest/v1/tenants?select=*&limit=1');
        console.log('Result:', res);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

run();
