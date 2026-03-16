const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxies = [
    "http://daknlrlb:sfpf7jrfkxta@31.59.20.176:6754",
    "http://daknlrlb:sfpf7jrfkxta@23.95.150.145:6114",
    "http://daknlrlb:sfpf7jrfkxta@198.23.239.134:6540",
    "http://daknlrlb:sfpf7jrfkxta@45.38.107.97:6014",
    "http://daknlrlb:sfpf7jrfkxta@107.172.163.27:6543",
    "http://daknlrlb:sfpf7jrfkxta@198.105.121.200:6462",
    "http://daknlrlb:sfpf7jrfkxta@64.137.96.74:6641",
    "http://daknlrlb:sfpf7jrfkxta@216.10.27.159:6837",
    "http://daknlrlb:sfpf7jrfkxta@142.111.67.146:5611",
    "http://daknlrlb:sfpf7jrfkxta@191.96.254.138:6185"
];

export default async function handler(req, res) {
    const { id } = req.query;
    if (!id) return res.status(400).send("No ID");

    const targetUrl = `https://api.shoob.gg/site/api/cardr/${id}?size=400`;

    // 🔄 Auto-Retry Loop: Try up to 3 different proxies just in case one is offline!
    for (let i = 0; i < 3; i++) {
        const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
        const agent = new HttpsProxyAgent(randomProxy);

        try {
            // We use GET but tell Axios NOT to follow the redirect (maxRedirects: 0)
            // This forces Cloudflare to hand over the secret cdn.shoob.gg link instantly!
            const response = await axios.get(targetUrl, {
                httpsAgent: agent,
                maxRedirects: 0, 
                timeout: 4000, // 4 seconds max per proxy, keeps it blazing fast
                validateStatus: status => status >= 200 && status < 400,
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
                }
            });

            // Grab the CDN link from the redirect headers
            const cdnUrl = response.headers.location;

            if (cdnUrl) {
                // SUCCESS! Cache this on Vercel for 30 days so we never have to ask Shoob again
                res.setHeader('Cache-Control', 'public, max-age=2592000');
                // Redirect the user/bot straight to the working image!
                return res.redirect(302, cdnUrl);
            }
        } catch (err) {
            console.error(`Proxy ${randomProxy} failed. Retrying...`);
            continue; // Immediately try the next proxy in the loop
        }
    }

    // If all 3 proxies timeout, show a clean error image instead of breaking the JSON
    res.redirect(302, 'https://dummyimage.com/400x600/0f172a/ef4444.png&text=Proxy+Timeout+Retry');
}
