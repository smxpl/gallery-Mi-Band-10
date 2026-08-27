const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        // Load your existing base.rpk from the ROOT of your repo
        const zip = new AdmZip(path.join(__dirname, 'base.rpk'));
        const outputZip = new AdmZip();

        // Copy everything except gallery images
        zip.getEntries().forEach(entry => {
            if (!entry.entryName.startsWith("assets/gallery/")) {
                outputZip.addFile(entry.entryName, entry.getData());
            }
        });

        // Add new gallery images
        let index = 1;
        for (const file of req.files) {
            const outputPath = `temp_${index}.png`;

            await sharp(file.path)
                .resize(480, 480)
                .png()
                .toFile(outputPath);

            outputZip.addLocalFile(outputPath, "assets/gallery/");
            fs.unlinkSync(file.path);
            fs.unlinkSync(outputPath);
            index++;
        }

        // Save final RPK
        const outputName = "custom_gallery.rpk";
        outputZip.writeZip(outputName);

        // FIXED: send the file from the correct location
        res.download(path.join(__dirname, outputName));
    } catch (err) {
        console.error(err);
        res.status(500).send("Error processing RPK");
    }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});



