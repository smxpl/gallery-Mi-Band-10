// Upload route enforcing dynamic counts, minimum constraints (2 photos), and image cloning
app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        const baseFolder = path.join(__dirname, 'src');
        const galleryFolder = path.join(baseFolder, 'common');
        const configFile = path.join(baseFolder, 'config.json');

        // 1. CONSTRAINT CHECK: Enforce user upload minimum limits (At least 2 photos)
        if (!req.files || req.files.length < 2) {
            return res.status(400).send("Validation Error: You must upload at least 2 photos to generate a gallery app.");
        }

        // Folder safety checking blocks
        if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder, { recursive: true });
        if (!fs.existsSync(galleryFolder)) fs.mkdirSync(galleryFolder, { recursive: true });

        // Clean out old images safely while protecting icon.png
        fs.readdirSync(galleryFolder).forEach(file => {
            const filePath = path.join(galleryFolder, file);
            if (fs.statSync(filePath).isFile() && file !== 'icon.png') {
                fs.unlinkSync(filePath);
            }
        });

        // 2. FILE QUANTITY LIMITING: Cut off arrays at a hardware boundary cap of 10 items
        const uploadedCount = Math.min(req.files.length, 10);
        const uniqueProcessedPaths = [];

        // Process and save the unique images the user uploaded
        for (let i = 0; i < uploadedCount; i++) {
            const file = req.files[i];
            const outputPath = path.join(galleryFolder, `img${i + 1}.png`);

            await sharp(file.path)
                .resize(192, 490) // Match the actual narrow aspect ratio of the watch screen!
                .png({ 
                    quality: 60,       // Compresses the imagery payload
                    colours: 128,      // Trims down the heavy color palette index 
                    compressionLevel: 9 // Maximize space compression
                })
                .toFile(outputPath);

            uniqueProcessedPaths.push(outputPath);
            fs.unlinkSync(file.path); // Clean up the temp upload file
        }

        // Clean up any unused multi-upload files above our 10-count cutoff limit
        if (req.files.length > 10) {
            for (let i = 10; i < req.files.length; i++) {
                if (fs.existsSync(req.files[i].path)) {
                    fs.unlinkSync(req.files[i].path);
                }
            }
        }

        // 3. BACKFILL SLOTS AUTOMATICALLY: If user uploaded fewer than 10, fill slots up to 10
        // It cycles back and duplicates their own images so there are no empty slots or default placeholders!
        let targetSlotIndex = uploadedCount + 1;
        while (targetSlotIndex <= 10) {
            // Find which unique user image to clone using a remainder loop
            const sourceImageToClone = uniqueProcessedPaths[(targetSlotIndex - 1) % uploadedCount];
            const destinationPath = path.join(galleryFolder, `img${targetSlotIndex}.png`);
            
            // Native file system copy operation
            fs.copyFileSync(sourceImageToClone, destinationPath);
            targetSlotIndex++;
        }

        // 4. METADATA WRITING: Save the exact number of unique images to config.json
        const configurationMetaData = { totalImages: uploadedCount };
        fs.writeFileSync(configFile, JSON.stringify(configurationMetaData, null, 2));

        // Package everything using native zipper tool logic
        const outputZip = new AdmZip();
        outputZip.addLocalFolder(baseFolder);

        const tempFilePath = path.join(__dirname, 'custom_gallery.rpk');
        outputZip.writeZip(tempFilePath);

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Transfer-Encoding', 'binary');

        res.download(tempFilePath, 'custom_gallery.rpk', (err) => {
            if (err) console.error("Download handling error:", err);
            try {
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            } catch (unlinkErr) {
                console.error("Server asset cleaning trace error:", unlinkErr);
            }
        });

    } catch (err) {
        console.error("RPK COMPILER CRITICAL ERROR:", err);
        res.status(500).send("Server compilation backend runtime error.");
    }
});
