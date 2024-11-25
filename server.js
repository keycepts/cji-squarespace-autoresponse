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
        
        // Validate required fields
        if (!formData.email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        
        // Format the current date
        const date = new Date();
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const sendSmtpEmail = {
            to: [{
                email: formData.email.trim(),
                name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Friend'
            }],
            sender: {
                email: process.env.SENDER_EMAIL || "contact@cjinashville.org",
                name: process.env.SENDER_NAME || "Choosing Justice Initiative"
            },
            subject: formData.subject ? 
                `Re: ${formData.subject} - Thank you for contacting CJI` : 
                "Thank you for contacting Choosing Justice Initiative",
            htmlContent: `
                <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: #2c5282; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0;">Thank You for Reaching Out</h1>
                        </div>
                        
                        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <p style="font-size: 16px;">Dear ${formData.firstName || 'Friend'},</p>
                            
                            <p style="font-size: 16px;">Thank you for contacting Choosing Justice Initiative. We have received your message and will get back to you shortly.</p>
                            
                            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="color: #2c5282; margin-top: 0;">Your Submission Details:</h3>
                                <p><strong>Date:</strong> ${formattedDate}</p>
                                <p><strong>Name:</strong> ${formData.firstName || ''} ${formData.lastName || ''}</p>
                                <p><strong>Email:</strong> ${formData.email}</p>
                                ${formData.subject ? `<p><strong>Subject:</strong> ${formData.subject}</p>` : ''}
                                ${formData.message ? `<p><strong>Your Message:</strong><br>${formData.message.replace(/\n/g, '<br>')}</p>` : ''}
                            </div>
                            
                            <p style="font-size: 16px;">We strive to respond to all inquiries within 24-48 business hours. If your matter is urgent, please call our office at <a href="tel:615-241-2600" style="color: #2c5282; text-decoration: none;">615-241-2600</a>.</p>
                            
                            <hr style="border: none; border-top: 1px solid #edf2f7; margin: 30px 0;">
                            
                            <div style="font-size: 14px; color: #666;">
                                <p style="margin-bottom: 5px;"><strong>Choosing Justice Initiative</strong></p>
                                <p style="margin-bottom: 5px;">Transforming Pretrial Justice in Tennessee</p>
                                <p style="margin-bottom: 5px;"><a href="https://cjinashville.org" style="color: #2c5282; text-decoration: none;">www.cjinashville.org</a></p>
                                <p style="margin-bottom: 5px;"><a href="tel:615-241-2600" style="color: #2c5282; text-decoration: none;">615-241-2600</a></p>
                            </div>
                        </div>
                    </body>
                </html>
            `
        };

        console.log('Attempting to send email to:', formData.email);
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully:', response);
        
        res.status(200).json({
            message: 'Auto-response sent successfully',
            emailSentTo: formData.email
        });
        
    } catch (error) {
        console.error('Error details:', error);
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
