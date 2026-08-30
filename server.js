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

        // Render-safe folder creator: Creates the folders if Git ignored them
        if (!fs.existsSync(baseFolder)) {
            fs.mkdirSync(baseFolder, { recursive: true });
        }
        if (!fs.existsSync(galleryFolder)) {
            fs.mkdirSync(galleryFolder, { recursive: true });
        }

        // Clean out old images safely
        fs.readdirSync(galleryFolder).forEach(file => {
            const filePath = path.join(galleryFolder, file);
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        });

        let index = 1;
        for (const file of req.files) {
            const outputPath = path.join(galleryFolder, `img_${index}.png`);

            await sharp(file.path)
    .resize(192, 192) // Match the actual narrow aspect ratio of the watch screen!
    .png({ 
        quality: 60,       // Compresses the imagery payload
        colours: 128,      // Trims down the heavy color palette index 
        compressionLevel: 9 // Maximize space compression
    })
    .toFile(outputPath);

            fs.unlinkSync(file.path);
            index++;
        }

        // --- FIXED NATIVE ZIPPER LOGIC ---
        const outputZip = new AdmZip();
        
        // Tells the zipper: "Go inside the 'src' folder, and zip everything inside it directly."
        outputZip.addLocalFolder(baseFolder);
        // ---------------------------------

        // --- RENDER-SAFE FILE DELIVERY ---
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

// --- RENDER PORT BIND FIX ---
// Render forces you to use their dynamic port system (PORT 10000 by default)
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running safely on port ${PORT}`);
});
