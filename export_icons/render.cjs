const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = __dirname;

const growthSvgFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(file => file.startsWith('growth_') && file.endsWith('.svg'));

const appIconSvgPath = path.resolve(OUTPUT_DIR, '..', 'build', 'icon.svg');
const appIconPngPath = path.resolve(OUTPUT_DIR, '..', 'build', 'icon.png');

const renderJobs = [
    ...growthSvgFiles.map((file) => ({
        svgPath: path.join(OUTPUT_DIR, file),
        outputPath: path.join(OUTPUT_DIR, file.replace('.svg', '.png')),
        label: file,
    })),
];

if (fs.existsSync(appIconSvgPath)) {
    renderJobs.push({
        svgPath: appIconSvgPath,
        outputPath: appIconPngPath,
        label: 'build/icon.svg',
    });
}

console.log('Found SVG files to render:', renderJobs.map((j) => j.label));

app.whenReady().then(async () => {
    try {
        const win = new BrowserWindow({
            show: false,
            width: 256,
            height: 256,
            frame: false,
            transparent: true,
            webPreferences: {
                offscreen: true,
                backgroundThrottling: false
            }
        });

        for (const job of renderJobs) {
            const svgContent = fs.readFileSync(job.svgPath, 'utf8');

            console.log(`Rendering ${job.label}...`);

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
                        svg { width: 256px; height: 256px; display: block; }
                    </style>
                </head>
                <body>
                    ${svgContent}
                </body>
                </html>
            `;

            await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
            // Wait a bit to ensure rendering is complete
            await new Promise(r => setTimeout(r, 200));

            const image = await win.capturePage();
            const pngBuffer = image.toPNG();

            fs.writeFileSync(job.outputPath, pngBuffer);
            console.log(`Saved ${path.relative(OUTPUT_DIR, job.outputPath)}`);
        }

        console.log('All icons exported successfully.');
        app.quit();
    } catch (err) {
        console.error('Error:', err);
        app.exit(1);
    }
});
