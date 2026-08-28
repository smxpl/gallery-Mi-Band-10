const express = require('express');
const app = express();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const AdmZip = require('adm-zip');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload route
app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        // Correct HyperOS watchface folder
        const baseFolder = path.join(__dirname, 'src');
        const galleryFolder = path.join(baseFolder, 'common');

        // Ensure folder exists
        if (!fs.existsSync(galleryFolder)) {
            return res.status(500).send("common folder missing in src/");
        }

        // Clear existing images
        fs.readdirSync(galleryFolder).forEach(file => {
            fs.unlinkSync(path.join(galleryFolder, file));
        });

        // Process uploaded images
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

        // Build RPK ZIP
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

        // Send RPK file
        const buffer = outputZip.toBuffer();
        res.setHeader('Content-Disposition', 'attachment; filename="custom_gallery.rpk"');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(buffer);

    } catch (err) {
        console.error("RPK ERROR:", err);
        res.status(500).send("Error processing RPK");
    }
});

// Start server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
