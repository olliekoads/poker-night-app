const nodemailer = require('nodemailer');

async function testEmailConfig() {
  console.log('Testing Gmail SMTP configuration...\n');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'edwinlin1987@gmail.com',
      pass: 'hobvjnswittxfbih'
    }
  });

  try {
    // Verify connection
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Send test email
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: '"Poker Night Test" <edwinlin1987@gmail.com>',
      to: 'edwinlin1987@gmail.com',
      subject: '🃏 Poker App Email Test',
      text: 'This is a test email from the poker app backend to verify Gmail SMTP is working correctly.',
      html: '<p>This is a test email from the poker app backend to verify Gmail SMTP is working correctly.</p>'
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\nCheck edwinlin1987@gmail.com inbox for the test email.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    process.exit(1);
  }
}

testEmailConfig();
