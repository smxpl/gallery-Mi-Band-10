const express = require('express');
const app = express();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const AdmZip = require('adm-zip');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve your frontend
app.use(express.static('public'));

// Homepage fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload route
app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        const baseFolder = path.join(__dirname, 'src');
        const galleryFolder = path.join(baseFolder, 'common');

        if (!fs.existsSync(galleryFolder)) {
            return res.status(500).send("common folder missing in src/");
        }

        fs.readdirSync(galleryFolder).forEach(file => {
            fs.unlinkSync(path.join(galleryFolder, file));
        });

        let index = 1;
        for (const file of req.files) {
            const outputPath = path.join(galleryFolder, `img_${index}.png`);

            await sharp(file.path)
                .resize(480, 480)
                .png()
                .toFile(outputPath);

            fs.unlinkSync(file.path);
            index++;
        }

        const outputZip = new AdmZip();

        const addFolderToZip = (folderPath, zipPath = "") => {
            fs.readdirSync(folderPath).forEach(item => {
                const fullPath = path.join(folderPath, item);
                const zipItemPath = path.join(zipPath, item);

                if (fs.statSync(fullPath).isDirectory()) {
                    addFolderToZip(fullPath, zipItemPath);
                } else {
                    outputZip.addLocalFile(fullPath, zipPath);
                }
            });
        };

        addFolderToZip(baseFolder);

        // --- UPDATED RESPONSE LOGIC TO FORCE .RPK DOWNLOADING ---
        // 1. Create a physical temp file path on your server
        const tempFilePath = path.join(__dirname, 'custom_gallery.rpk');
        
        // 2. Write the zip archive directly to disk as an .rpk
        outputZip.writeZip(tempFilePath);

        // 3. Set strict headers before streaming the real file
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Transfer-Encoding', 'binary');

        // 4. Send the file using native Express download (forces the name to stick)
        res.download(tempFilePath, 'custom_gallery.rpk', (err) => {
            if (err) {
                console.error("Download error:", err);
            }
            // 5. Clean up the temp file after the download finishes
            try {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            } catch (unlinkErr) {
                console.error("Cleanup error:", unlinkErr);
            }
        });
        // --------------------------------------------------------

    } catch (err) {
        console.error("RPK ERROR:", err);
        res.status(500).send("Error processing RPK");
    }
});

// Start server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
