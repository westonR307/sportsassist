const axios = require('axios');
const https = require('https');

// Create an axios instance that ignores self-signed certificate issues
const agent = new https.Agent({
  rejectUnauthorized: false
});

async function getRegistrationsForCamp(campId) {
  try {
    console.log(`Fetching registrations for camp ID ${campId}...`);
    
    // Get 
    const response = await axios.get(`http://localhost:3000/api/camps/${campId}/registrations`, {
      httpsAgent: agent,
      validateStatus: status => true // Return response regardless of status code
    });
    
    console.log(`Response status: ${response.status}`);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error fetching registrations:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Call the function with camp ID 7
getRegistrationsForCamp(7);
