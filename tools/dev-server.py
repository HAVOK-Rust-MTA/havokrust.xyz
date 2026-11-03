#!/usr/bin/env python3
# Servidor local do site com as rotas por caminho: /wiki/item/c4, /ranking... devolvem o index.html
# (como o GitHub Pages faz com o 404.html e o Worker havok-site faz em produção). Arquivo que existe sai como está.
#
#   python3 tools/dev-server.py            # http://127.0.0.1:8080  (porta liberada no CORS das APIs)
#   python3 tools/dev-server.py 9000
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def send_head(self):
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        last = path.rstrip('/').rsplit('/', 1)[-1]
        target = pathlib.Path(self.translate_path(path))
        # rota do site: sem extensão e sem arquivo/pasta de verdade (pasta com index.html, como /play/, segue normal)
        if '.' not in last and not target.is_file() and not (target / 'index.html').is_file():
            self.path = '/index.html'
        return super().send_head()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
