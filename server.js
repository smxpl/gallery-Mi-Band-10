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
// Upload route
app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        const baseFolder = path.join(__dirname, 'src');
        const galleryFolder = path.join(baseFolder, 'common');

        if (!fs.existsSync(galleryFolder)) {
            return res.status(500).send("common folder missing in src/");
        }

        // Clean out old images
        fs.readdirSync(galleryFolder).forEach(file => {
            fs.unlinkSync(path.join(galleryFolder, file));
        });

        // Process and save new images
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

        // --- FIXED ZIPPER LOGIC HERE ---
        const outputZip = new AdmZip();
        
        // This single line replaces your whole addFolderToZip function.
        // It tells the zipper: "Go inside the 'src' folder, and zip everything inside it directly."
        outputZip.addLocalFolder(baseFolder);
        // -------------------------------

        // --- UPDATED RESPONSE LOGIC TO FORCE .RPK DOWNLOADING ---
        const tempFilePath = path.join(__dirname, 'custom_gallery.rpk');
        
        outputZip.writeZip(tempFilePath);

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Transfer-Encoding', 'binary');

        res.download(tempFilePath, 'custom_gallery.rpk', (err) => {
            if (err) {
                console.error("Download error:", err);
            }
            try {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            } catch (unlinkErr) {
                console.error("Cleanup error:", unlinkErr);
            }
        });

    } catch (err) {
        console.error("RPK ERROR:", err);
        res.status(500).send("Error processing RPK");
    }
});
