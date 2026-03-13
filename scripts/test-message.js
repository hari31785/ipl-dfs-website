const fetch = require('node-fetch');

async function testMessage() {
  try {
    console.log('Testing message submission...\n');

    const response = await fetch('http://localhost:3000/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Message',
        message: 'This is a test message to verify the messaging system is working correctly.'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Message sent successfully!');
      console.log('Message ID:', data.data.id);
      console.log('\nYou can now view this message in the admin dashboard at:');
      console.log('http://localhost:3000/admin/messages');
    } else {
      console.log('❌ Failed to send message:', data.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n⚠️  Make sure the dev server is running (npm run dev)');
  }
}

testMessage();
