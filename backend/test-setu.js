const axios = require('axios');

async function test() {
  const url = 'https://dg-sandbox.setu.co/api/digilocker';
  const headers = {
    'Content-Type': 'application/json',
    'x-client-id': 'f14d81a0-09a7-48ed-be98-699ad3bf3dfb',
    'x-client-secret': 'LUHFXaSJUw9nqPm3AAHegu6HM1LXRTGo',
    'x-product-instance-id': '16e9dd3e-19dd-4a07-85a3-c3b473212287'
  };
  const data = {
    redirectUrl: 'https://bharatscore.vercel.app/kyc/callback'
  };

  try {
    const response = await axios.post(url, data, { headers });
    console.log('Success:', response.data);
  } catch (error) {
    console.log('Status:', error.response?.status);
    console.log('Error Data:', error.response?.data);
  }
}

test();
