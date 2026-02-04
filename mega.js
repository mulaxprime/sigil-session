import * as mega from 'megajs';

// MULAA SIGIL XMD - Mega authentication credentials
const auth = {
    email: 'amantlempaekae@gmail.com', // Replace with your MULAA Mega email
    password: 'amantlempaekae1123@', // Replace with your MULAA Mega password
    userAgent: 'MULAA-SIGIL-XMD/1.0 (Powered by Mulaa Company; Gaborone, Botswana)'
};

// MULAA Function to upload a file to Mega and return the URL
export const mulaaUpload = (data, name) => {
    return new Promise((resolve, reject) => {
        try {
            // Authenticate with Mega storage
            const storage = new mega.Storage(auth, () => {
                // Upload the data stream to Mega with MULAA branding
                const uploadStream = storage.upload({ 
                    name: `MULAA_${Date.now()}_${name}`, 
                    allowUploadBuffering: true 
                });

                // Pipe the data into Mega
                data.pipe(uploadStream);

                // When the file is successfully uploaded, resolve with the file's URL
                storage.on("add", (file) => {
                    file.link((err, url) => {
                        if (err) {
                            reject(`MULAA Upload Error: ${err.message}`); 
                        } else {
                            storage.close(); // Close the storage session
                            console.log(`✅ MULAA File Uploaded: ${name}`);
                            resolve({
                                url: url,
                                filename: name,
                                timestamp: new Date().toISOString(),
                                company: "Mulaa Company",
                                founder: "Amantle Mpaekae",
                                location: "Gaborone, Botswana"
                            }); // Return enriched response
                        }
                    });
                });

                // Handle errors during file upload process
                storage.on("error", (error) => {
                    reject(`MULAA Storage Error: ${error.message}`);
                });
            });
        } catch (err) {
            reject(`MULAA System Error: ${err.message}`);
        }
    });
};

// MULAA Function to download a file from Mega using a URL
export const mulaaDownload = (url) => {
    return new Promise((resolve, reject) => {
        try {
            console.log(`⬇️ MULAA Downloading: ${url}`);
            
            // Get file from Mega using the URL
            const file = mega.File.fromURL(url);

            file.loadAttributes((err) => {
                if (err) {
                    reject(`MULAA Download Error: ${err.message}`);
                    return;
                }

                // Download the file buffer
                file.downloadBuffer((err, buffer) => {
                    if (err) {
                        reject(`MULAA Buffer Error: ${err.message}`);
                    } else {
                        console.log(`✅ MULAA Download Complete: ${file.name}`);
                        resolve({
                            buffer: buffer,
                            filename: file.name,
                            size: buffer.length,
                            timestamp: new Date().toISOString(),
                            message: "Tech with Souls and Emotions - Mulaa Company"
                        });
                    }
                });
            });
        } catch (err) {
            reject(`MULAA Download System Error: ${err.message}`);
        }
    });
};

// MULAA Additional utility functions
export const mulaaFileInfo = (url) => {
    return new Promise((resolve, reject) => {
        try {
            const file = mega.File.fromURL(url);
            file.loadAttributes((err) => {
                if (err) {
                    reject(`MULAA File Info Error: ${err.message}`);
                    return;
                }
                resolve({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    created: file.timestamp,
                    lastModified: file.modified,
                    company: "Mulaa Sigil AI",
                    founder: "Amantle Mpaekae"
                });
            });
        } catch (err) {
            reject(`MULAA Info Error: ${err.message}`);
        }
    });
};

// Export with MULAA branding
export default {
    upload: mulaaUpload,
    download: mulaaDownload,
    fileInfo: mulaaFileInfo,
    version: "1.0.0",
    company: "Mulaa Company",
    founder: "Amantle Mpaekae",
    location: "Gaborone, Botswana",
    motto: "Tech with Souls and Emotions"
};