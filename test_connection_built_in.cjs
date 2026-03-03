
const https = require('https');

const options = {
    hostname: 'dqjwzzdvfqfchnnspmnb.supabase.co',
    port: 443,
    path: '/rest/v1/tenants?select=count',
    method: 'GET',
    headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxand6emR2ZnFmY2hubnNwbW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDA5NzgsImV4cCI6MjA4NTgxNjk3OH0.7Z9XBalE0eWWQvoBtoQwjcXlnHeBFIZ73r4Y07Hnc3I',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxand6emR2ZnFmY2hubnNwbW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDA5NzgsImV4cCI6MjA4NTgxNjk3OH0.7Z9XBalE0eWWQvoBtoQwjcXlnHeBFIZ73r4Y07Hnc3I'
    }
};

const req = https.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (e) => {
    console.error('Error:', e.message);
});

req.end();
