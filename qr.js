const express = require('express');
const fs = require('fs');
const pino = require('pino');
const { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');

const router = express.Router();

// Function to remove files or directories
function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
        return true;
    } catch (e) {
        console.error('MULAA Error removing file:', e);
        return false;
    }
}

// Helper function for generating random IDs
function makeMulaaId(length = 8) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return `MULAA_${result}`;
}

router.get('/', async (req, res) => {
    // Generate unique MULAA session for each request
    const sessionId = makeMulaaId();
    const dirs = `./mulaa_qr_sessions/${sessionId}`;

    // Ensure mulaa_qr_sessions directory exists
    if (!fs.existsSync('./mulaa_qr_sessions')) {
        fs.mkdirSync('./mulaa_qr_sessions', { recursive: true });
    }

    async function initiateMULAA_Session() {
        // ✅ Create the MULAA session folder
        if (!fs.existsSync(dirs)) fs.mkdirSync(dirs, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            const { version, isLatest } = await fetchLatestBaileysVersion();
            
            let qrGenerated = false;
            let responseSent = false;
            let mulaaSock = null;

            // MULAA QR Code handling logic
            const handleMULAA_QRCode = async (qr) => {
                if (qrGenerated || responseSent) return;
                
                qrGenerated = true;
                console.log('🟢 MULAA: QR Code Generated!');
                console.log('📱 MULAA: Waiting for WhatsApp scan...');
                
                try {
                    // Generate QR code as data URL with MULAA styling
                    const qrDataURL = await QRCode.toDataURL(qr, {
                        errorCorrectionLevel: 'H',
                        type: 'image/png',
                        quality: 1.0,
                        margin: 2,
                        color: {
                            dark: '#0a0f1a',  // MULAA dark blue
                            light: '#00bfff'   // MULAA light blue
                        }
                    });

                    if (!responseSent) {
                        responseSent = true;
                        console.log('✅ MULAA: QR Code generated successfully');
                        await res.send({ 
                            qr: qrDataURL, 
                            message: 'MULAA SIGIL XMD - QR Code Ready!',
                            instructions: [
                                '🔐 MULAA SIGIL XMD QR Login',
                                '1. Open WhatsApp on your phone',
                                '2. Go to Settings > Linked Devices',
                                '3. Tap "Link a Device"',
                                '4. Scan the QR code above',
                                '5. Your session will be sent via WhatsApp'
                            ],
                            sessionId: sessionId,
                            company: "Mulaa Company",
                            founder: "Amantle Mpaekae",
                            location: "Gaborone, Botswana"
                        });
                    }
                } catch (qrError) {
                    console.error('❌ MULAA: Error generating QR code:', qrError);
                    if (!responseSent) {
                        responseSent = true;
                        res.status(500).send({ 
                            code: 'MULAA QR Generation Failed',
                            message: 'Failed to generate MULAA QR code'
                        });
                    }
                }
            };

            // MULAA Baileys socket configuration
            const mulaaSocketConfig = {
                version,
                logger: pino({ 
                    level: 'silent',
                    transport: {
                        target: 'pino-pretty',
                        options: { colorize: true }
                    }
                }),
                browser: Browsers.macOS('MULAA SIGIL XMD'),
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                retryRequestDelayMs: 250,
                maxRetries: 5,
            };

            // Create MULAA socket
            mulaaSock = makeWASocket(mulaaSocketConfig);
            let reconnectAttempts = 0;
            const maxReconnectAttempts = 3;

            // MULAA Connection event handler
            const handleMULAA_ConnectionUpdate = async (update) => {
                const { connection, lastDisconnect, qr } = update;
                console.log(`🔄 MULAA Connection update: ${connection || 'undefined'}`);

                if (qr && !qrGenerated) {
                    await handleMULAA_QRCode(qr);
                }

                if (connection === 'open') {
                    console.log('✅ MULAA: Connected successfully!');
                    console.log('💾 MULAA: Session saved to:', dirs);
                    reconnectAttempts = 0;
                    
                    try {
                        // Read the session file
                        const sessionData = fs.readFileSync(dirs + '/creds.json');
                        const sessionBase64 = sessionData.toString('base64');
                        const fullSession = `${sessionId}~${sessionBase64}`;
                        
                        // Get the user's JID
                        const userJid = mulaaSock.user?.id ? jidNormalizedUser(mulaaSock.user.id) : null;
                            
                        if (userJid) {
                            // Send session data to user with MULAA branding
                            await mulaaSock.sendMessage(userJid, {
                                text: `🔐 *MULAA SIGIL XMD SESSION*\n\n` +
                                      `📱 Session ID: ${sessionId}\n\n` +
                                      `🔑 Session Data:\n\`\`\`\n${fullSession}\n\`\`\`\n\n` +
                                      `💾 Save this session for future use.`
                            });
                            console.log("📄 MULAA: Session sent successfully to", userJid);
                            
                            // Send MULAA welcome message
                            await mulaaSock.sendMessage(userJid, {
                                text: `╭─═━⌬━═─⊹⊱✦⊰⊹─═━⌬━═─\n` +
                                      `╎   『 𝐌𝐔𝐋𝐀𝐀 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃 』   \n` +
                                      `╎  ✦ MULAA SIGIL XMD SESSION\n` +
                                      `╎  ✦ Founder: Amantle Mpaekae\n` +
                                      `╎  ✦ Location: Gaborone, Botswana\n` +
                                      `╰╴╴╴╴\n\n` +
                                      `▌   『 🔐 𝐘𝐎𝐔𝐑 𝐒𝐄𝐒𝐒𝐈𝐎𝐍 』   \n` +
                                      `▌  • Check previous message for session data\n` +
                                      `▌  • Save it securely for future use\n\n` +
                                      `╔═\n` +
                                      `╟   『 𝐌𝐔𝐋𝐀𝐀 𝐂𝐎𝐌𝐏𝐀𝐍𝐘 』  \n` +
                                      `╟  👑 Founder: Amantle Mpaekae\n` +
                                      `╟  🌍 Location: Gaborone, Botswana  \n` +
                                      `╟  💡 Vision: "Tech with Souls and Emotions"\n` +
                                      `╟  🏢 Company: Mulaa Sigil AI\n` +
                                      `╟  🎨 Theme: Emotional AI Theme\n` +
                                      `╰  \n` +
                                      `✦⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅✦  \n` +
                                      `   𝐄𝐍𝐉𝐎𝐘 𝐌𝐔𝐋𝐀𝐀 𝐒𝐈𝐆𝐈𝐋 𝐗𝐌𝐃!  \n` +
                                      `✦⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅✦`
                            });
                            console.log("👑 MULAA: Welcome message sent");
                            
                            // Send security warning
                            await mulaaSock.sendMessage(userJid, {
                                text: `⚠️ *MULAA SECURITY WARNING*\n\n` +
                                      `• DO NOT share this session with anyone\n` +
                                      `• This session gives access to your WhatsApp\n` +
                                      `• Store it securely\n` +
                                      `• MULAA Company - "Tech with Souls and Emotions"`
                            });
                            console.log("⚠️ MULAA: Security warning sent");

                            // Save session backup
                            const backupDir = './mulaa_session_backups';
                            if (!fs.existsSync(backupDir)) {
                                fs.mkdirSync(backupDir, { recursive: true });
                            }
                            
                            const backupFile = `${backupDir}/${sessionId}_${Date.now()}.txt`;
                            fs.writeFileSync(backupFile, fullSession);
                            console.log(`💾 MULAA: Session backed up to ${backupFile}`);
                            
                        } else {
                            console.log("❌ MULAA: Could not determine user JID");
                        }
                    } catch (error) {
                        console.error("❌ MULAA: Error sending session:", error);
                    }
                    
                    // Clean up session after delay
                    setTimeout(() => {
                        console.log('🧹 MULAA: Cleaning up session...');
                        const deleted = removeFile(dirs);
                        if (deleted) {
                            console.log('✅ MULAA: Session cleaned up successfully');
                        } else {
                            console.log('❌ MULAA: Failed to clean up session folder');
                        }
                        
                        // Close connection
                        if (mulaaSock) {
                            try {
                                mulaaSock.ws.close();
                                console.log('🔒 MULAA: Connection closed');
                            } catch (closeError) {
                                console.log('MULAA: Connection already closed');
                            }
                        }
                    }, 10000);
                }

                if (connection === 'close') {
                    console.log('❌ MULAA: Connection closed');
                    if (lastDisconnect?.error) {
                        console.log('❗ MULAA: Last Disconnect Error:', lastDisconnect.error);
                    }
                    
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    
                    if (statusCode === 401) {
                        console.log('🔐 MULAA: Logged out - need new QR code');
                        removeFile(dirs);
                    } else if (statusCode === 515 || statusCode === 503) {
                        console.log(`🔄 MULAA: Stream error (${statusCode}) - attempting reconnect...`);
                        reconnectAttempts++;
                        
                        if (reconnectAttempts <= maxReconnectAttempts) {
                            console.log(`🔄 MULAA: Reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
                            setTimeout(() => {
                                try {
                                    mulaaSock = makeWASocket(mulaaSocketConfig);
                                    mulaaSock.ev.on('connection.update', handleMULAA_ConnectionUpdate);
                                    mulaaSock.ev.on('creds.update', saveCreds);
                                } catch (err) {
                                    console.error('❌ MULAA: Failed to reconnect:', err);
                                }
                            }, 2000);
                        } else {
                            console.log('❌ MULAA: Max reconnect attempts reached');
                            if (!responseSent) {
                                responseSent = true;
                                res.status(503).send({ 
                                    code: 'MULAA Connection Failed',
                                    message: 'Connection failed after multiple attempts'
                                });
                            }
                        }
                    }
                }
            };

            // Bind MULAA event handlers
            mulaaSock.ev.on('connection.update', handleMULAA_ConnectionUpdate);
            mulaaSock.ev.on('creds.update', saveCreds);

            // Set timeout for QR generation
            setTimeout(() => {
                if (!responseSent) {
                    responseSent = true;
                    res.status(408).send({ 
                        code: 'MULAA QR Timeout',
                        message: 'QR generation timeout - please try again'
                    });
                    removeFile(dirs);
                }
            }, 30000);

        } catch (err) {
            console.error('❌ MULAA: Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ 
                    code: 'MULAA Service Unavailable',
                    message: 'Mulaa service is currently unavailable'
                });
            }
            removeFile(dirs);
        }
    }

    await initiateMULAA_Session();
});

// Global MULAA exception handler
process.on('uncaughtException', (err) => {
    let e = String(err);
    if (e.includes("conflict")) return;
    if (e.includes("not-authorized")) return;
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    if (e.includes("Stream Errored")) return;
    if (e.includes("Stream Errored (restart required)")) return;
    if (e.includes("statusCode: 515")) return;
    if (e.includes("statusCode: 503")) return;
    console.log('❌ MULAA: Caught exception: ', err);
});

module.exports = router;  // CommonJS export