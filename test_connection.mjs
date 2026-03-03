
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const url = 'https://dqjwzzdvfqfchnnspmnb.supabase.co/rest/v1/tenants?select=count';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxand6emR2ZnFmY2hubnNwbW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNDA5NzgsImV4cCI6MjA4NTgxNjk3OH0.7Z9XBalE0eWWQvoBtoQwjcXlnHeBFIZ73r4Y07Hnc3I';

async function test() {
    console.log('Testing connection to Supabase...');
    try {
        const res = await fetch(url, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
