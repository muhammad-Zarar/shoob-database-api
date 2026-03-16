// api/image.js
export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send("No URL provided");
    }

    try {
        // Fetch the image from Shoob while spoofing the Discord/Bot headers
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://discord.com/",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        // Get the image buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Forward the correct content type (usually webp or png)
        const contentType = response.headers.get("content-type") || "image/webp";
        
        // Cache the image on Vercel's Edge Network for 24 hours so it's lightning fast
        res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
        res.setHeader("Content-Type", contentType);
        
        // Send the image directly to the user!
        res.send(buffer);

    } catch (error) {
        // Fallback transparent pixel if everything burns down
        const fallback = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
        res.setHeader("Content-Type", "image/png");
        res.send(fallback);
    }
}
