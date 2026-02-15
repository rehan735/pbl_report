const axios = require('axios');

async function register() {
    try {
        console.log('Sending registration request...');
        const res = await axios.post('http://localhost:5000/api/auth/register', {
            name: 'Test Test',
            email: 'testscrip3@example.com',
            password: 'password123'
        });
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
