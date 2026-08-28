const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        // Correct folder structure for YOUR repo
        const baseFolder = path.join(__dirname, 'gallery', 'src');

        // Your repo uses gallery/src/common, NOT gallery/src/assets/common
        const galleryFolder = path.join(baseFolder, 'common');

        // Ensure folder exists (Linux requires this)
        if (!fs.existsSync(galleryFolder)) {
            return res.status(500).send("Gallery folder missing on server");
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

        const buffer = outputZip.toBuffer();
        res.setHeader('Content-Disposition', 'attachment; filename="custom_gallery.rpk"');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(buffer);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error processing RPK");
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
