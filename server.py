import http.server
import socketserver
import urllib.parse

PORT = 4848

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.path = urllib.parse.unquote(self.path)
        if self.path == '/':
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("serving at port", PORT)
    httpd.serve_forever()
