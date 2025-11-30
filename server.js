
const http = require('http');
const fs = require('fs');
const path = require('path');

// Cloud Run fornece a porta via variável de ambiente, padrão é 8080
const PORT = process.env.PORT || 8080;

// Tenta detectar a pasta de build (Vite usa 'dist', CRA usa 'build')
const distPath = fs.existsSync(path.join(__dirname, 'dist')) 
    ? path.join(__dirname, 'dist') 
    : path.join(__dirname, 'build');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
};

const server = http.createServer((req, res) => {
    // Normaliza a URL para o caminho do arquivo
    let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
    const extname = String(path.extname(filePath)).toLowerCase();

    // Se não tiver extensão, assume que é uma rota do React e serve o index.html
    if (!extname || extname === '') {
        filePath = path.join(distPath, 'index.html');
    }

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Suporte a SPA (Single Page Application):
                // Se o arquivo não existir (ex: /dashboard), serve o index.html
                fs.readFile(path.join(distPath, 'index.html'), (err, indexContent) => {
                    if (err) {
                        res.writeHead(500);
                        res.end('Erro: index.html nao encontrado. Certifique-se de ter rodado "npm run build".');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(indexContent, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Erro no servidor: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Servindo arquivos de: ${distPath}`);
});
