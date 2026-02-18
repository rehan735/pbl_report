const http = require('http');

const SERVICES = [
    { name: 'Node.js Backend', url: 'http://localhost:5000/health' },
    { name: 'Python Prediction Service', url: 'http://localhost:5001/health' }
];

function checkService(service) {
    return new Promise((resolve) => {
        const start = Date.now();
        http.get(service.url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const duration = Date.now() - start;
                console.log(`✅ ${service.name} is UP (${duration}ms)`);
                console.log(`   Response: ${data}\n`);
                resolve(true);
            });
        }).on('error', (err) => {
            console.log(`❌ ${service.name} is DOWN`);
            console.log(`   Error: ${err.message}\n`);
            resolve(false);
        });
    });
}

async function runChecks() {
    console.log('Checking project services...\n');
    for (const service of SERVICES) {
        await checkService(service);
    }
}

runChecks();
