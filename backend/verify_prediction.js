const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testPrediction() {
    try {
        const form = new FormData();
        const imagePath = path.join(__dirname, 'test_image.png');

        if (!fs.existsSync(imagePath)) {
            console.error('Test image not found at:', imagePath);
            return;
        }

        form.append('image', fs.createReadStream(imagePath));

        console.log('Sending request to http://localhost:5000/api/predict...');

        const response = await axios.post('http://localhost:5000/api/predict', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('Response Status:', response.status);
        console.log('Prediction Result:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Error Data:', error.response.data);
        }
    }
}

testPrediction();
