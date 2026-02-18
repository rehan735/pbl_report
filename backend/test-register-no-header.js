const axios = require('axios');

async function register() {
    try {
        console.log('Sending registration request WITHOUT content-type...');
        // Axios automatically sets Content-Type for objects, so we pass a string and force header override?
        // Or just use http module.
        // Actually, let's use a config that unsets it.
        const res = await axios.post('http://localhost:5000/api/auth/register',
            JSON.stringify({
                name: 'Test NoHeader',
                email: 'testnoheader@example.com',
                password: 'password123'
            }),
            {
                headers: {
                    'Content-Type': 'text/plain' // Simulate wrong header
                }
            }
        );
        console.log('Response:', res.data);
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', err.response.data);
        }
    }
}

register();
