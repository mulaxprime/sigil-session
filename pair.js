const express = require('express');
const fs = require('fs');
const pino = require('pino');
const { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pn = require('awesome-phonenumber');

const router = express.Router();

// Ensure the session directory exists
function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
    } catch (e) {
        console.error('MULAA Error removing file:', e);
    }
}

// Helper function for generating random IDs
function makeid(length = 6) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    let dirs = './' + (num || `mulaa_session_${Date.now()}`);

    // Remove existing session if present
    await removeFile(dirs);

    // Clean the phone number - remove any non-digit characters
    num = num.replace(/[^0-9]/g, '');

    // Validate the phone number using awesome-phonenumber
    const phone = pn('+' + num);
    if (!phone.isValid()) {
        if (!res.headersSent) {
            return res.status(400).send({ 
                code: 'Invalid phone number. Please enter your full international number (e.g., 26775462914 for Botswana, 15551234567 for US, 447911123456 for UK, etc.) without + or spaces.' 
            });
        }
        return;
    }
    // Use the international number format (E.164, without '+')
    num = phone.getNumber('e164').replace('+', '');

    async function initiateMULAA_Session() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            const { version, isLatest } = await fetchLatestBaileysVersion();
            let MULAA_Sigil = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS('MULAA SIGIL XMD'),
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                retryRequestDelayMs: 250,
                maxRetries: 5,
            });

            MULAA_Sigil.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, isNewLogin, isOnline } = update;

                if (connection === 'open') {
                    console.log("✅ MULAA: Connected successfully!");
                    console.log("📱 MULAA: Sending session file to user...");
                    
                    try {
                        const sessionData = fs.readFileSync(dirs + '/creds.json');
                        const sessionBase64 = sessionData.toString('base64');
                        const fullSession = `MULAA_${Date.now().toString(36)}_${makeid(6)}~${sessionBase64}`;

                        // Send session as text message with MULAA branding
                        const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                        
                        // Send session data as text
                        await MULAA_Sigil.sendMessage(userJid, {
                            text: `🔐 *MULAA SIGIL XMD SESSION*\n\n` +
                                  `📱 Session ID: ${fullSession.split('~')[0]}\n\n` +
                                  `🔑 Session Data:\n\`\`\`\n${fullSession}\n\`\`\`\n\n` +
                                  `💾 Save this session for future use.`
                        });
                        console.log("📄 MULAA: Session sent successfully");

                        // Send welcome message with MULAA branding
                        await MULAA_Sigil.sendMessage(userJid, {
                            text: `╭─═━⌬━═─⊹⊱✦⊰⊹─═━⌬━═─\n` +
                                  `╎   『 𝐌𝐔𝐋𝐀𝐀 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃 』   \n` +
                                  `╎  ✦ MULAA SIGIL XMD SESSION\n` +
                                  `╎  ✦ Founder: Amantle Mpaekae\n` +
                                  `╎  ✦ Location: Gaborone, Botswana\n` +
                                  `╰╴╴╴╴\n\n` +
                                  `▌   『 🔐 𝐘𝐎𝐔𝐑 𝐒𝐄𝐒𝐒𝐈𝐎𝐍 』   \n` +
                                  `▌  • Check previous message for your session data\n` +
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
                                  `✦⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅⋆⋅✦  \n` +
                                  `______________________________\n` +
                                  `★彡[ᴛᴇᴄʜ ᴡɪᴛʜ sᴏᴜʟs ᴀɴᴅ ᴇᴍᴏᴛɪᴏɴs]彡★`
                        });
                        console.log("👑 MULAA: Welcome message sent");

                        // Send warning message
                        await MULAA_Sigil.sendMessage(userJid, {
                            text: `⚠️ *SECURITY WARNING*\n\n` +
                                  `• DO NOT share this session with anyone\n` +
                                  `• This session gives access to your WhatsApp\n` +
                                  `• Store it securely\n` +
                                  `• MULAA Company is not responsible for shared sessions`
                        });
                        console.log("⚠️ MULAA: Security warning sent");

                        // Also save session to backup file
                        const backupDir = './mulaa_backups';
                        if (!fs.existsSync(backupDir)) {
                            fs.mkdirSync(backupDir, { recursive: true });
                        }
                        
                        const backupFile = `${backupDir}/MULAA_${num}_${Date.now()}.txt`;
                        fs.writeFileSync(backupFile, fullSession);
                        console.log(`💾 MULAA: Session backed up to ${backupFile}`);

                        // Clean up session after use
                        console.log("🧹 MULAA: Cleaning up session...");
                        await delay(2000);
                        removeFile(dirs);
                        console.log("✅ MULAA: Session cleaned up successfully");
                        console.log("🎉 MULAA: Process completed successfully!");
                        
                    } catch (error) {
                        console.error("❌ MULAA: Error sending messages:", error);
                        // Still clean up session even if sending fails
                        removeFile(dirs);
                    }
                }

                if (isNewLogin) {
                    console.log("🔐 MULAA: New login via pair code");
                }

                if (isOnline) {
                    console.log("📶 MULAA: Client is online");
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;

                    if (statusCode === 401) {
                        console.log("❌ MULAA: Logged out from WhatsApp. Need to generate new pair code.");
                    } else {
                        console.log("🔁 MULAA: Connection closed — restarting...");
                        initiateMULAA_Session();
                    }
                }
            });

            if (!MULAA_Sigil.authState.creds.registered) {
                await delay(3000); // Wait 3 seconds before requesting pairing code
                num = num.replace(/[^\d+]/g, '');
                if (num.startsWith('+')) num = num.substring(1);

                try {
                    let code = await MULAA_Sigil.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    if (!res.headersSent) {
                        console.log({ num, code });
                        await res.send({ code });
                    }
                } catch (error) {
                    console.error('❌ MULAA: Error requesting pairing code:', error);
                    if (!res.headersSent) {
                        res.status(503).send({ 
                            code: 'Failed to get MULAA pairing code. Please check your phone number and try again.' 
                        });
                    }
                }
            }

            MULAA_Sigil.ev.on('creds.update', saveCreds);
        } catch (err) {
            console.error('❌ MULAA: Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ 
                    code: 'MULAA Service Unavailable' 
                });
            }
        }
    }

    await initiateMULAA_Session();
});

// Global uncaught exception handler
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