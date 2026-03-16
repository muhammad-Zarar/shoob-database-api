const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
    const { key, random, id } = req.query;
    
    // Auth Check
    if (key !== 'SILENT_TECH_2026') {
        return res.status(401).json({ error: "Unauthorized API Key" });
    }

    try {
        // Load your database
        const dbPath = path.join(process.cwd(), 'master_database.json');
        const rawData = fs.readFileSync(dbPath, 'utf8');
        const cards = JSON.parse(rawData);

        let selectedCard = null;

        // Pick card
        if (random === 'true') {
            selectedCard = cards[Math.floor(Math.random() * cards.length)];
        } else if (id) {
            selectedCard = cards.find(c => c.id === id || c.card_id === id);
        }

        if (!selectedCard) {
            return res.status(404).json({ error: "Card not found" });
        }

        // Grabs the ID properly no matter how your JSON is formatted
        const realId = selectedCard.id || selectedCard.card_id;

        // MAGIC TRICK: Route the image through YOUR Vercel Proxy
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const proxyImageUrl = `${protocol}://${host}/api/image?id=${realId}`;

        // Return the exact structure your HTML frontend expects
        res.status(200).json({
            id: realId,
            name: selectedCard.name || selectedCard.character || "Unknown",
            tier: selectedCard.tier || "Unknown",
            series: selectedCard.series || "Unknown",
            maker: selectedCard.maker || "Official",
            image: proxyImageUrl, 
            original_url: selectedCard.image || selectedCard.image_url
        });

    } catch (error) {
        console.error("DB Error:", error);
        res.status(500).json({ error: "Database error" });
    }
}
