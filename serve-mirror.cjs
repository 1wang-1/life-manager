const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 47813;
const root = path.join(process.cwd(), '.eb-binaries-mirror');

console.log(`Serving ${root} on port ${port}`);

http.createServer((req, res) => {
    const u = new url.URL(req.url, `http://127.0.0.1:${port}`);
    let rel = decodeURIComponent(u.pathname);
    if (rel.startsWith('/')) rel = rel.substring(1);
    
    // Safety check
    const fp = path.join(root, rel);
    if (!fp.startsWith(root)) {
        res.statusCode = 403;
        res.end('Forbidden');
        console.log(`403 ${req.url}`);
        return;
    }

    fs.stat(fp, (err, st) => {
        if (err || !st.isFile()) {
            res.statusCode = 404;
            res.end('Not found');
            console.log(`404 ${req.url}`);
            return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Length', st.size);
        fs.createReadStream(fp).pipe(res);
        console.log(`200 ${req.url} (${st.size} bytes)`);
    });
}).listen(port, '127.0.0.1', () => {
    console.log(`Mirror up at http://127.0.0.1:${port}/`);
});
