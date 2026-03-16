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

    for (let i = 0; i < 3; i++) {
        const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
        const agent = new HttpsProxyAgent(randomProxy);

        try {
            // Tell Axios to grab the raw data, and accept BOTH 200 (Image) and 302 (Redirect)
            const response = await axios.get(targetUrl, {
                httpsAgent: agent,
                maxRedirects: 0, 
                responseType: 'arraybuffer', // Ready to catch the image buffer!
                timeout: 6000, 
                validateStatus: status => status >= 200 && status <= 308,
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Referer': 'https://shoob.gg/'
                }
            });

            // SCENARIO 1: Shoob hands us a redirect to the CDN
            if (response.status >= 300 && response.headers.location) {
                res.setHeader('Cache-Control', 'public, max-age=2592000');
                return res.redirect(302, response.headers.location);
            }

            // SCENARIO 2: Shoob hands us the image file directly
            if (response.status === 200) {
                res.setHeader('Cache-Control', 'public, max-age=2592000');
                res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
                return res.status(200).send(Buffer.from(response.data));
            }

        } catch (err) {
            console.error(`Proxy ${randomProxy} failed. Retrying...`);
            continue; 
        }
    }

    // Failsafe if everything burns down
    res.redirect(302, 'https://dummyimage.com/400x600/0f172a/ef4444.png&text=Proxy+Failed');
}
