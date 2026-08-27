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
        const zip = new AdmZip("base.rpk");
        const outputZip = new AdmZip();

        zip.getEntries().forEach(entry => {
            if (!entry.entryName.startsWith("assets/gallery/")) {
                outputZip.addFile(entry.entryName, entry.getData());
            }
        });

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

        const outputName = "custom_gallery.rpk";
        outputZip.writeZip(outputName);

        res.download(outputName);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error processing RPK");
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
