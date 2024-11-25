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
        console.log('Received form submission:', req.body);
        
        const formData = req.body;
        
        // Create new Brevo API instance
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        
        // Prepare email data
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        
        sendSmtpEmail.subject = "Thank you for contacting us";
        sendSmtpEmail.htmlContent = `
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h1 style="color: #2c5282;">Thank you for contacting us!</h1>
                    <p>Dear ${formData.firstName},</p>
                    <p>We have received your message and will get back to you shortly.</p>
                    <p>Here's a summary of your submission:</p>
                    <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px;">
                        <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
                        <p><strong>Email:</strong> ${formData.email}</p>
                        <p><strong>Subject:</strong> ${formData.subject}</p>
                        <p><strong>Message:</strong> ${formData.message}</p>
                    </div>
                    <p>We strive to respond to all inquiries within 24-48 business hours.</p>
                    <p>Best regards,<br>Your Company Name</p>
                </body>
            </html>
        `;
        sendSmtpEmail.sender = {
            "name": process.env.SENDER_NAME || "Your Company",
            "email": process.env.SENDER_EMAIL || "your@company.com"
        };
        sendSmtpEmail.to = [{"email": formData.email, "name": `${formData.firstName} ${formData.lastName}`}];
        
        // Send the auto-response email
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Auto-response sent successfully:', response);
        res.status(200).json({message: 'Auto-response sent successfully'});
        
    } catch (error) {
        console.error('Error sending auto-response:', error);
        res.status(500).json({error: 'Failed to send auto-response'});
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
