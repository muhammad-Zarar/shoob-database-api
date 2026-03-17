from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import yt_dlp

# Bypass YouTube bot-protection by using mobile/embedded player clients.
# Android and iOS clients hit a different internal API (youtubei.googleapis.com)
# that does not enforce the same Proof-of-Origin / sign-in requirement that the
# standard web player uses.  tv_embedded / web_embedded are additional fallbacks.
_BYPASS_EXTRACTOR_ARGS = {
    'youtube': {
        'player_client': ['android', 'ios', 'tv_embedded', 'web_embedded'],
    }
}

_BASE_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'extractor_args': _BYPASS_EXTRACTOR_ARGS,
    'socket_timeout': 30,
    'retries': 3,
}

_BOT_KEYWORDS = ('sign in to confirm', "you're not a bot", 'bot detection',
                 'proof of origin', 'po token', 'cookies')


def _is_bot_error(msg: str) -> bool:
    lower = msg.lower()
    return any(kw in lower for kw in _BOT_KEYWORDS)


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()

    def _send_json(self, status_code, payload):
        body = json.dumps(payload).encode()
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        url = params.get('url', [None])[0]
        media_type = params.get('type', ['video'])[0].lower()
        if media_type not in ('video', 'audio'):
            media_type = 'video'

        if not url:
            self._send_json(400, {
                "creator": "Muhammad Zarar",
                "status": 400,
                "success": False,
                "error": "No URL provided. Use ?url=YOUTUBE_URL"
            })
            return

        try:
            if media_type == 'audio':
                ydl_opts = {
                    **_BASE_OPTS,
                    'format': 'bestaudio[ext=m4a]/bestaudio/best',
                }
            else:
                ydl_opts = {
                    **_BASE_OPTS,
                    'format': 'best[ext=mp4]/best',
                }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            if media_type == 'audio':
                fmt = info.get('ext', 'm4a')
                abr = info.get('abr')
                quality = f"{int(abr)}kbps" if abr else 'Best Audio'
            else:
                fmt = info.get('ext', 'mp4')
                height = info.get('height')
                quality = f"{height}p" if height else info.get('format_note', 'Best')

            self._send_json(200, {
                "creator": "Muhammad Zarar",
                "status": 200,
                "success": True,
                "result": {
                    "type": media_type,
                    "format": fmt,
                    "title": info.get('title', ''),
                    "thumbnail": info.get('thumbnail', ''),
                    "quality": quality,
                    "download_url": info.get('url', '')
                }
            })
        except Exception as e:
            err_msg = str(e)
            if _is_bot_error(err_msg):
                err_msg = (
                    "YouTube is blocking this request even after trying Android, iOS, "
                    "TV-Embedded, and Web-Embedded player clients. "
                    "Technical reason: YouTube enforces a server-side Proof-of-Origin (PO) "
                    "token for this video that can only be obtained from a real logged-in "
                    "browser session. No fully server-side bypass exists for such videos "
                    "without cookies. This is a YouTube platform restriction."
                )
            self._send_json(500, {
                "creator": "Muhammad Zarar",
                "status": 500,
                "success": False,
                "error": err_msg
            })
