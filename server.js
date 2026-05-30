require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static frontend files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for temporary file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Configure Nodemailer Transport
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// API Endpoint to handle quote submission
app.post('/api/quote', upload.single('file'), async (req, res) => {
    try {
        const { name, email, phone, comments, dimensions, volume } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No 3D file uploaded.' });
        }

        // Parse calculated data sent from frontend
        const parsedDimensions = JSON.parse(dimensions);
        
        // Construct Email Content
        const mailOptions = {
            from: `"3D Print Quoter" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL,
            subject: `New 3D Print Quote Request from ${name}`,
            text: `
                New Quote Request Details:
                --------------------------
                Name: ${name}
                Email: ${email}
                Phone: ${phone}
                Comments: ${comments || 'None'}
                
                Model Specifications:
                ---------------------
                Dimensions (X x Y x Z): ${parsedDimensions.x.toFixed(2)} x ${parsedDimensions.y.toFixed(2)} x ${parsedDimensions.z.toFixed(2)} mm
                Volume: ${volume} cm³
                File Name: ${file.originalname}
            `,
            attachments: [
                {
                    filename: file.originalname,
                    path: file.path
                }
            ]
        };

        // Send Email
        await transporter.sendMail(mailOptions);

        // Clean up: delete the temporary file after sending
        fs.unlinkSync(file.path);

        res.status(200).json({ message: 'Quote request submitted successfully!' });

    } catch (error) {
        console.error('Error processing quote:', error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});