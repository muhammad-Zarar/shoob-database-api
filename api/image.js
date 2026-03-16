const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Your 10 Premium Proxies (Formatted for the agent)
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
    if (!id) return res.status(400).send("No Card ID provided");

    // The target URL that throws Cloudflare errors for normal bots
    const targetUrl = `https://api.shoob.gg/site/api/cardr/${id}?size=400`;
    
    // Pick a random proxy from your pool
    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    const agent = new HttpsProxyAgent(randomProxy);

    try {
        // Fetch the image through the proxy (automatically follows redirects)
        const response = await axios.get(targetUrl, {
            httpsAgent: agent,
            responseType: 'arraybuffer', // Get the raw image data
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/png,image/jpeg,image/*,*/*;q=0.8'
            }
        });

        // Serve the image buffer directly to whoever asked for it (WhatsApp/HTML)
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache it for 24 hours so we don't waste proxies!
        res.status(200).send(Buffer.from(response.data));

    } catch (error) {
        console.error("Proxy fetch failed:", error.message);
        // Fallback: If the proxy fails, send a tiny transparent pixel or error image so WhatsApp doesn't crash
        res.status(500).send("Image fetch failed");
    }
}
