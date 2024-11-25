require('dotenv').config();
const express = require('express');
const cors = require('cors');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configure Brevo API client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Webhook endpoint for Squarespace form
app.post('/form-webhook', async (req, res) => {
    try {
        console.log('Received form submission:', JSON.stringify(req.body, null, 2));
        
        const formData = req.body;
        
        // Debug log
        console.log('Processing email:', formData.email);
        
        // Validate email
        if (!formData.email) {
            console.log('Email missing from form data');
            return res.status(400).json({ error: 'Email is required' });
        }

        // Create new TransactionalEmailsApi instance
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        
        // Create SendSmtpEmail object
        const sendSmtpEmail = {
            to: [{
                email: formData.email.trim(),
                name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Friend'
            }],
            sender: {
                email: process.env.SENDER_EMAIL || "contact@cjinashville.org",
                name: process.env.SENDER_NAME || "Choosing Justice Initiative"
            },
            subject: "Thank you for contacting Choosing Justice Initiative",
            htmlContent: `
                <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <h1 style="color: #2c5282;">Thank you for reaching out!</h1>
                        <p>Dear ${formData.firstName || 'Friend'},</p>
                        <p>We have received your message and will get back to you shortly.</p>
                        <p>Here's a summary of your submission:</p>
                        <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px;">
                            <p><strong>Name:</strong> ${formData.firstName || ''} ${formData.lastName || ''}</p>
                            <p><strong>Email:</strong> ${formData.email}</p>
                            ${formData.subject ? `<p><strong>Subject:</strong> ${formData.subject}</p>` : ''}
                            ${formData.message ? `<p><strong>Message:</strong> ${formData.message}</p>` : ''}
                        </div>
                        <p>We strive to respond to all inquiries within 24-48 business hours.</p>
                        <p>Best regards,<br>Choosing Justice Initiative</p>
                    </body>
                </html>
            `
        };

        // Debug log before sending
        console.log('Attempting to send email with config:', JSON.stringify({
            to: sendSmtpEmail.to,
            sender: sendSmtpEmail.sender,
            subject: sendSmtpEmail.subject
        }, null, 2));

        // Send email
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully:', response);
        
        res.status(200).json({
            message: 'Auto-response sent successfully',
            emailSentTo: formData.email
        });
        
    } catch (error) {
        console.error('Detailed error:', JSON.stringify(error, null, 2));
        res.status(500).json({
            error: 'Failed to send auto-response',
            details: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
