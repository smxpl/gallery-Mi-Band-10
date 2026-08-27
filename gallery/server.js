app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        // Path to your UNPACKED RPK folder
        const baseFolder = path.join(__dirname, 'src');
        const galleryFolder = path.join(baseFolder, 'assets', 'common');

        // Remove old gallery images
        fs.readdirSync(galleryFolder).forEach(file => {
            fs.unlinkSync(path.join(galleryFolder, file));
        });

        // Add new gallery images
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

        // Repack the folder into a new RPK
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

        // Send the RPK directly (Render-safe)
        const buffer = outputZip.toBuffer();
        res.setHeader('Content-Disposition', 'attachment; filename="custom_gallery.rpk"');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(buffer);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error processing RPK");
    }
});
