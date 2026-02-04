const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Importing MULAA modules
let pairRouter, qrRouter;
try {
    pairRouter = require('./pair.js');
    qrRouter = require('./qr.js');
    console.log('✅ MULAA modules loaded successfully');
} catch (error) {
    console.error('❌ Failed to load MULAA modules:', error.message);
    console.log('⚠️ Please make sure pair.js and qr.js exist and use CommonJS syntax');
    process.exit(1);
}

const app = express();

const PORT = process.env.PORT || 8000;

// Increase event listeners
require('events').EventEmitter.defaultMaxListeners = 500;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Create necessary directories
const directories = ['./mulaa_qr_sessions', './mulaa_session_backups', './mulaa_backups', './temp'];
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created MULAA directory: ${dir}`);
    }
});

// Create simple HTML files if they don't exist
function createBasicHTMLFiles() {
    const files = {
        'index.html': `
<!DOCTYPE html>
<html>
<head>
    <title>MULAA SIGIL XMD</title>
    <style>
        body {
            background: #0a0f1a;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            color: #00bfff;
            margin-bottom: 20px;
        }
        .btn {
            display: inline-block;
            margin: 10px;
            padding: 12px 24px;
            background: #00bfff;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
        }
        .footer {
            margin-top: 50px;
            color: #aaa;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 MULAA SIGIL XMD</h1>
        <p>Welcome to MULAA SIGIL XMD - Emotional AI WhatsApp Solutions</p>
        <p><strong>Founder:</strong> Amantle Mpaekae</p>
        <p><strong>Location:</strong> Gaborone, Botswana</p>
        <p><em>"Tech with Souls and Emotions"</em></p>
        
        <div style="margin: 40px 0;">
            <a href="/pair" class="btn">🔗 Get Pairing Code</a>
            <a href="/qr" class="btn">📱 Get QR Code</a>
        </div>
        
        <div class="footer">
            <p>© 2024 Mulaa Company | MULAA SIGIL XMD</p>
        </div>
    </div>
</body>
</html>`,

        'pair.html': `
<!DOCTYPE html>
<html>
<head>
    <title>MULAA Pairing</title>
    <style>
        body {
            background: #0a0f1a;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background: rgba(255,255,255,0.05);
            padding: 30px;
            border-radius: 10px;
            border: 1px solid rgba(0,191,255,0.2);
        }
        h1 {
            color: #00bfff;
            margin-bottom: 20px;
        }
        input {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            border: 1px solid #00bfff;
            border-radius: 5px;
            background: rgba(0,0,0,0.3);
            color: white;
            font-size: 16px;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #00bfff;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 10px;
        }
        #result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 5px;
            min-height: 50px;
        }
        .footer {
            margin-top: 30px;
            color: #aaa;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 MULAA Pairing Code</h1>
        <p>Enter your WhatsApp number with country code</p>
        <input type="text" id="number" placeholder="Example: +26775462914">
        <button onclick="getCode()">Get Pairing Code</button>
        <div id="result">Your code will appear here</div>
    </div>
    
    <div class="footer">
        <p>© 2024 Mulaa Company | Founder: Amantle Mpaekae</p>
    </div>
    
    <script>
        async function getCode() {
            const number = document.getElementById('number').value;
            const resultDiv = document.getElementById('result');
            
            if (!number) {
                resultDiv.innerHTML = '<p style="color:#ff5555;">Please enter your number</p>';
                return;
            }
            
            // Clean number (remove + and spaces)
            const cleanNumber = number.replace(/[^0-9]/g, '');
            
            resultDiv.innerHTML = '<p>Getting MULAA code...</p>';
            
            try {
                const response = await fetch('/code?number=' + cleanNumber);
                const data = await response.json();
                
                if (data.code) {
                    resultDiv.innerHTML = '<p style="color:#00ff9d;">✅ MULAA Code: <strong>' + data.code + '</strong></p>';
                } else {
                    resultDiv.innerHTML = '<p style="color:#ff5555;">Error: ' + (data.message || 'Unknown error') + '</p>';
                }
            } catch (error) {
                resultDiv.innerHTML = '<p style="color:#ff5555;">Connection error. Please try again.</p>';
            }
        }
    </script>
</body>
</html>`
    };

    Object.entries(files).forEach(([filename, content]) => {
        const filePath = path.join(__dirname, filename);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, content.trim());
            console.log(`📄 Created ${filename}`);
        }
    });
}

// Create HTML files
createBasicHTMLFiles();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

// API Routes
app.use('/code', pairRouter);  // Pairing codes API
app.use('/qr', qrRouter);      // QR codes API

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'MULAA SIGIL XMD',
        version: '1.0.0',
        founder: 'Amantle Mpaekae',
        company: 'Mulaa Company',
        location: 'Gaborone, Botswana',
        motto: 'Tech with Souls and Emotions'
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        service: 'MULAA SIGIL XMD',
        status: 'operational',
        endpoints: {
            home: '/',
            pair: '/pair',
            qr: '/qr',
            code: '/code',
            health: '/health',
            status: '/status'
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: '404 Not Found',
        message: 'MULAA SIGIL XMD - Resource not found',
        available: ['/', '/pair', '/qr', '/code', '/health', '/status']
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ MULAA Server Error:', err);
    res.status(500).json({
        error: 'MULAA Service Error',
        message: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╭─═━⌬━═─⊹⊱✦⊰⊹─═━⌬━═─ 
╎  🚀 MULAA SIGIL XMD Started
╎  ✦ Port: ${PORT}
╎  ✦ Founder: Amantle Mpaekae
╎  ✦ Company: Mulaa Company
╎  ✦ Location: Gaborone, Botswana
╎  ✦ Vision: "Tech with Souls and Emotions"
╰╴╴╴╴

✦⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅✦  
   Server running on http://localhost:${PORT}  
✦⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅✦  

📱 Available Endpoints:
├─ Homepage: http://localhost:${PORT}/
├─ Pairing: http://localhost:${PORT}/pair
├─ QR API: http://localhost:${PORT}/qr
├─ Code API: http://localhost:${PORT}/code
├─ Health: http://localhost:${PORT}/health
└─ Status: http://localhost:${PORT}/status
`);
});

module.exports = app;  // CommonJS export