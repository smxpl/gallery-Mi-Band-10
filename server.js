const express = require('express');
const app = express();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { exec } = require('child_process'); // 🌟 NEW: Needed to trigger terminal commands

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve your frontend
app.use(express.static('public'));

// Homepage fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload route executing official dynamic compilation engines
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
        const uniqueProcessedPaths =;

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
        let targetSlotIndex = uploadedCount + 1;
        while (targetSlotIndex <= 10) {
            const sourceImageToClone = uniqueProcessedPaths[(targetSlotIndex - ) % uploadedCount];
            const destinationPath = path.join(galleryFolder, `img${targetSlotIndex}.png`);
            fs.copyFileSync(sourceImageToClone, destinationPath);
            targetSlotIndex++;
        }

        // 4. METADATA WRITING: Save the exact number of unique images to config.json
        const configurationMetaData = { totalImages: uploadedCount };
        fs.writeFileSync(configFile, JSON.stringify(configurationMetaData, null, 2));

        // 5. 🌟 TERMINAL COMPILER TRIGGER: Replaces AdmZip with real build execution!
        exec('npm run build', (compileError, stdout, stderr) => {
            if (compileError) {
                console.error("Compilation engine crashed:", compileError);
                return res.status(500).send("Internal Server Build Error.");
            }

            // Target the freshly compiled, signed .rpk generated in Render's new dist folder
            const compiledDistFolder = path.join(__dirname, 'dist');
            
            // Read the directory to find the generated package name dynamically
            const filesInDist = fs.readdirSync(compiledDistFolder);
            const rpkFileName = filesInDist.find(f => f.endsWith('.rpk'));

            if (!rpkFileName) {
                return res.status(500).send("Build error: Compiled package artifact missing.");
            }

            const finalRpkPath = path.join(compiledDistFolder, rpkFileName);

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Transfer-Encoding', 'binary');

            // Send the authentic compiled bundle straight back to the browser panel!
            res.download(finalRpkPath, 'custom_gallery.rpk', (downloadErr) => {
                if (downloadErr) console.error("Download processing trace error:", downloadErr);
                
                // Clean up server-side dist file trace artifacts safely after delivery
                try {
                    if (fs.existsSync(finalRpkPath)) fs.unlinkSync(finalRpkPath);
                } catch (cleanupErr) {
                    console.error("Post-build trace cleaning exception:", cleanupErr);
                }
            });
        });

    } catch (err) {
        console.error("RPK COMPILER CRITICAL ERROR:", err);
        res.status(500).send("Server compilation backend runtime error.");
    }
});

// --- RENDER PORT BIND FIX ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running safely on port ${PORT}`);
});

