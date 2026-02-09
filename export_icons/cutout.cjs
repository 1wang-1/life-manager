const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const ROOT = path.resolve(__dirname, '..');
const INPUT_DIR = path.join(ROOT, 'public', 'growth-stages');

const files = [
    'stage_0.png',
    'stage_1.png',
    'stage_2.png',
    'stage_3.png',
    'stage_4.png',
    'stage_5.png'
].map((f) => path.join(INPUT_DIR, f));

function dataUrlFromPngBuffer(buf) {
    return `data:image/png;base64,${buf.toString('base64')}`;
}

function pngBufferFromDataUrl(dataUrl) {
    const idx = dataUrl.indexOf('base64,');
    if (idx === -1) throw new Error('Invalid data URL');
    const b64 = dataUrl.slice(idx + 'base64,'.length);
    return Buffer.from(b64, 'base64');
}

async function main() {
    await app.whenReady();

    const win = new BrowserWindow({
        show: false,
        width: 32,
        height: 32,
        frame: false,
        transparent: true,
        webPreferences: {
            offscreen: true,
            backgroundThrottling: false
        }
    });

    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;background:transparent;"><script>
        function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
        function colorDist(a, b) {
            return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]);
        }
        function avgColor(samples) {
            let r = 0, g = 0, b = 0, n = 0;
            for (const s of samples) {
                if (!s) continue;
                r += s[0]; g += s[1]; b += s[2];
                n += 1;
            }
            if (!n) return [255,255,255];
            return [Math.round(r/n), Math.round(g/n), Math.round(b/n)];
        }
        function getPixel(data, w, x, y) {
            const i = (y * w + x) * 4;
            return [data[i], data[i+1], data[i+2], data[i+3]];
        }
        function setAlpha(data, w, x, y, a) {
            const i = (y * w + x) * 4;
            data[i+3] = a;
        }
        function isBg(px, bg, distThreshold, alphaMin) {
            if (px[3] < alphaMin) return false;
            return colorDist(px, bg) <= distThreshold;
        }
        async function loadImage(dataUrl) {
            const img = new Image();
            img.decoding = 'async';
            img.src = dataUrl;
            if (img.decode) {
                await img.decode();
                return img;
            }
            await new Promise((res, rej) => {
                img.onload = () => res();
                img.onerror = (e) => rej(e);
            });
            return img;
        }
        window.__cutout = async function (dataUrl) {
            const img = await loadImage(dataUrl);
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;

            const distThreshold = 54;
            const alphaMin = 6;

            let opaqueBefore = 0;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] !== 0) opaqueBefore += 1;
            }

            const beforeCorners = [
                getPixel(data, w, 0, 0)[3],
                getPixel(data, w, w-1, 0)[3],
                getPixel(data, w, 0, h-1)[3],
                getPixel(data, w, w-1, h-1)[3]
            ];

            if (beforeCorners.every((a) => a < alphaMin)) {
                return {
                    pngDataUrl: canvas.toDataURL('image/png'),
                    w,
                    h,
                    bg: [255, 255, 255],
                    removed: 0,
                    opaqueBefore,
                    opaqueAfter: opaqueBefore,
                    beforeCorners,
                    afterCorners: beforeCorners
                };
            }

            const corners = [
                getPixel(data, w, 0, 0),
                getPixel(data, w, w-1, 0),
                getPixel(data, w, 0, h-1),
                getPixel(data, w, w-1, h-1)
            ].filter((p) => p[3] > 0);
            const bg = avgColor(corners);
            const visited = new Uint8Array(w * h);
            const mark = new Uint8Array(w * h);
            const qx = new Int32Array(w * h);
            const qy = new Int32Array(w * h);
            let qh = 0;
            let qt = 0;

            function push(x, y) {
                const idx = y * w + x;
                if (visited[idx]) return;
                visited[idx] = 1;
                qx[qt] = x;
                qy[qt] = y;
                qt += 1;
            }

            for (let x = 0; x < w; x += 1) {
                push(x, 0);
                push(x, h - 1);
            }
            for (let y = 1; y < h - 1; y += 1) {
                push(0, y);
                push(w - 1, y);
            }

            while (qh < qt) {
                const x = qx[qh];
                const y = qy[qh];
                qh += 1;
                const idx = y * w + x;

                const px = getPixel(data, w, x, y);
                if (!isBg(px, bg, distThreshold, alphaMin)) continue;
                mark[idx] = 1;

                if (x > 0) push(x - 1, y);
                if (x < w - 1) push(x + 1, y);
                if (y > 0) push(x, y - 1);
                if (y < h - 1) push(x, y + 1);
            }

            let removed = 0;
            for (let y = 0; y < h; y += 1) {
                for (let x = 0; x < w; x += 1) {
                    const idx = y * w + x;
                    if (mark[idx]) {
                        if (data[idx * 4 + 3] !== 0) removed += 1;
                        setAlpha(data, w, x, y, 0);
                    }
                }
            }

            {
                let minX = w, minY = h, maxX = -1, maxY = -1;
                for (let y = 0; y < h; y += 1) {
                    for (let x = 0; x < w; x += 1) {
                        const i = (y * w + x) * 4;
                        if (data[i + 3] < alphaMin) continue;
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }

                if (maxX >= minX && maxY >= minY) {
                    const bins = new Map();

                    function idxOf2(x, y) { return y * w + x; }
                    function getRGBA(x, y) {
                        const i = idxOf2(x, y) * 4;
                        return [data[i], data[i + 1], data[i + 2], data[i + 3]];
                    }
                    function isFlat(x, y) {
                        const c = getRGBA(x, y);
                        if (c[3] < alphaMin) return false;
                        const right = getRGBA(x + 1, y);
                        const down = getRGBA(x, y + 1);
                        if (right[3] < alphaMin || down[3] < alphaMin) return false;
                        return colorDist(c, right) <= 12 && colorDist(c, down) <= 12;
                    }
                    function addBin(px) {
                        const kr = px[0] >> 4;
                        const kg = px[1] >> 4;
                        const kb = px[2] >> 4;
                        const key = (kr << 8) | (kg << 4) | kb;
                        const cur = bins.get(key) || { c: 0, sr: 0, sg: 0, sb: 0 };
                        cur.c += 1;
                        cur.sr += px[0];
                        cur.sg += px[1];
                        cur.sb += px[2];
                        bins.set(key, cur);
                    }

                    for (let y = minY; y < maxY; y += 1) {
                        for (let x = minX; x < maxX; x += 1) {
                            if (!isFlat(x, y)) continue;
                            const px = getRGBA(x, y);
                            addBin(px);
                        }
                    }

                    let bestKey = null;
                    let bestCount = 0;
                    for (const [key, v] of bins.entries()) {
                        if (v.c > bestCount) {
                            bestCount = v.c;
                            bestKey = key;
                        }
                    }

                    if (bestKey !== null && bestCount >= 120) {
                        const v = bins.get(bestKey);
                        const bg2 = [Math.round(v.sr / v.c), Math.round(v.sg / v.c), Math.round(v.sb / v.c)];
                        const dist2 = 72;
                        const v2 = new Uint8Array(w * h);
                        const qx2 = new Int32Array(w * h);
                        const qy2 = new Int32Array(w * h);

                        function match2(x, y) {
                            if (x < minX || x > maxX || y < minY || y > maxY) return false;
                            const i = idxOf2(x, y) * 4;
                            if (data[i + 3] < alphaMin) return false;
                            const px = [data[i], data[i + 1], data[i + 2], data[i + 3]];
                            return colorDist(px, bg2) <= dist2;
                        }

                        function bfs2(sx, sy) {
                            let hq2 = 0;
                            let tq2 = 0;
                            qx2[tq2] = sx;
                            qy2[tq2] = sy;
                            tq2 += 1;
                            v2[idxOf2(sx, sy)] = 1;

                            let area = 0;
                            const pixels = [];

                            while (hq2 < tq2) {
                                const x = qx2[hq2];
                                const y = qy2[hq2];
                                hq2 += 1;
                                if (!match2(x, y)) continue;
                                area += 1;
                                pixels.push([x, y]);

                                if (x > minX) {
                                    const ni = idxOf2(x - 1, y);
                                    if (!v2[ni]) { v2[ni] = 1; qx2[tq2] = x - 1; qy2[tq2] = y; tq2 += 1; }
                                }
                                if (x < maxX) {
                                    const ni = idxOf2(x + 1, y);
                                    if (!v2[ni]) { v2[ni] = 1; qx2[tq2] = x + 1; qy2[tq2] = y; tq2 += 1; }
                                }
                                if (y > minY) {
                                    const ni = idxOf2(x, y - 1);
                                    if (!v2[ni]) { v2[ni] = 1; qx2[tq2] = x; qy2[tq2] = y - 1; tq2 += 1; }
                                }
                                if (y < maxY) {
                                    const ni = idxOf2(x, y + 1);
                                    if (!v2[ni]) { v2[ni] = 1; qx2[tq2] = x; qy2[tq2] = y + 1; tq2 += 1; }
                                }
                            }

                            return { area, pixels };
                        }

                        let bestComp = null;
                        for (let y = minY; y <= maxY; y += 1) {
                            for (let x = minX; x <= maxX; x += 1) {
                                const idx = idxOf2(x, y);
                                if (v2[idx]) continue;
                                v2[idx] = 1;
                                if (!match2(x, y)) continue;
                                const comp = bfs2(x, y);
                                if (!bestComp || comp.area > bestComp.area) bestComp = comp;
                            }
                        }

                        if (bestComp && bestComp.area >= 200) {
                            for (const [x, y] of bestComp.pixels) {
                                const i = (y * w + x) * 4;
                                if (data[i + 3] !== 0) {
                                    data[i + 3] = 0;
                                    removed += 1;
                                }
                            }
                        }
                    }
                }
            }

            for (let y = 1; y < h - 1; y += 1) {
                for (let x = 1; x < w - 1; x += 1) {
                    const idx = y * w + x;
                    const i = idx * 4;
                    if (data[i + 3] === 0) continue;
                    const px = [data[i], data[i + 1], data[i + 2], data[i + 3]];
                    if (!isBg(px, bg, distThreshold, alphaMin)) continue;
                    const n0 = data[((y - 1) * w + x) * 4 + 3] === 0;
                    const n1 = data[((y + 1) * w + x) * 4 + 3] === 0;
                    const n2 = data[(y * w + (x - 1)) * 4 + 3] === 0;
                    const n3 = data[(y * w + (x + 1)) * 4 + 3] === 0;
                    if (n0 || n1 || n2 || n3) data[i + 3] = 0;
                }
            }

            ctx.putImageData(imageData, 0, 0);

            const afterCorners = [
                getPixel(data, w, 0, 0)[3],
                getPixel(data, w, w-1, 0)[3],
                getPixel(data, w, 0, h-1)[3],
                getPixel(data, w, w-1, h-1)[3]
            ];

            let opaqueAfter = 0;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] !== 0) opaqueAfter += 1;
            }

            return {
                pngDataUrl: canvas.toDataURL('image/png'),
                w,
                h,
                bg,
                removed,
                opaqueBefore,
                opaqueAfter,
                beforeCorners,
                afterCorners
            };
        };
    </script></body></html>`;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    for (const filePath of files) {
        if (!fs.existsSync(filePath)) continue;
        const input = fs.readFileSync(filePath);
        const dataUrl = dataUrlFromPngBuffer(input);
        const result = await win.webContents.executeJavaScript(`window.__cutout(${JSON.stringify(dataUrl)})`, true);
        const outBuf = pngBufferFromDataUrl(result.pngDataUrl);
        fs.writeFileSync(filePath, outBuf);

        const name = path.basename(filePath);
        const bgStr = Array.isArray(result.bg) ? result.bg.join(',') : String(result.bg);
        console.log(`[cutout] ${name} ${result.w}x${result.h} bg(${bgStr}) removed:${result.removed} opaque:${result.opaqueBefore}->${result.opaqueAfter} corners:${result.beforeCorners.join(',')}->${result.afterCorners.join(',')}`);
    }

    await win.destroy();
    app.quit();
}

main().catch((err) => {
    console.error(err);
    app.exit(1);
});
