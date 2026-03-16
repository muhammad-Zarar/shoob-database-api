const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🔥 [GITHUB ACTIONS] The Master Database Builder has awakened...");

    const allIds = JSON.parse(fs.readFileSync('all_35k_ids.json', 'utf8'));
    let database = [];
    let completedIds = new Set();
    
    if (fs.existsSync('master_database.json')) {
        try {
            database = JSON.parse(fs.readFileSync('master_database.json', 'utf8'));
            database.forEach(card => completedIds.add(card.id));
            console.log(`📦 Resuming! Already finished ${completedIds.size} cards.`);
        } catch(e) {}
    }

    const pendingIds = allIds.filter(id => !completedIds.has(id));
    console.log(`🚀 Remaining cards to scrape: ${pendingIds.length}`);

    if (pendingIds.length === 0) {
        console.log("🎉 DATABASE IS 100% COMPLETE!");
        process.exit();
    }

    // 🔥 LIMIT TO 2000 PER RUN SO GITHUB CAN SAVE SAFELY!
    const BATCH_LIMIT = Math.min(pendingIds.length, 8000);
    const targetIds = pendingIds.slice(0, BATCH_LIMIT);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const CONCURRENCY = 20; // GitHub servers have 7GB RAM! We can do 10 tabs safely.

    for (let i = 0; i < targetIds.length; i += CONCURRENCY) {
        let promises = [];
        let batchData = [];

        for (let j = 0; j < CONCURRENCY && (i + j) < targetIds.length; j++) {
            const id = targetIds[i + j];
            
            promises.push((async () => {
                const page = await browser.newPage();
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    if (['image', 'media'].includes(req.resourceType())) req.abort();
                    else req.continue();
                });

                try {
                    const url = `https://shoob.gg/cards/info/${id}`;
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await page.waitForFunction(() => document.body && document.body.innerText.includes('Tier'), { timeout: 15000 }).catch(()=>{});

                    const cardData = await page.evaluate((cardId, cardUrl) => {
                        let card = {
                            id: cardId, name: "Unknown", tier: "Unknown", series: "Unknown", 
                            maker: "Official", image: `https://api.shoob.gg/site/api/cardr/${cardId}?size=original`, url: cardUrl
                        };
                        let lines = document.body.innerText.split('\n').map(t => t.trim()).filter(t => t.length > 0);
                        let tierLineIdx = lines.findIndex(l => l.match(/^Tier\s+[1-6S]$/i));
                        if (tierLineIdx !== -1) {
                            card.tier = lines[tierLineIdx].toUpperCase();
                            let nextLines = lines.slice(tierLineIdx + 1, tierLineIdx + 10).filter(l => l !== '>');
                            if (nextLines.length >= 2) {
                                card.series = nextLines[0]; 
                                card.name = nextLines[1];   
                            }
                        }
                        let makerLine = lines.find(l => l.startsWith('Card Maker:'));
                        if (makerLine) card.maker = makerLine.replace('Card Maker:', '').replace('See the Maker', '').trim();
                        if (card.name === "Unknown") {
                            let headerMatch = lines.find(l => l.match(/\-\s+T[1-6S]$/i)); 
                            if (headerMatch) card.name = headerMatch.split('-')[0].trim();
                        }
                        return card;
                    }, id, url);

                    batchData.push(cardData);
                    console.log(`✅ [${cardData.name} | ${cardData.tier}]`);
                } catch(e) {
                    console.log(`⚠️ Skipped ID ${id}`);
                } finally {
                    await page.close();
                }
            })());
        }

        await Promise.all(promises);
        batchData.forEach(card => database.push(card));
        fs.writeFileSync('master_database.json', JSON.stringify(database, null, 2));
    }

    console.log(`\n🏆 BATCH COMPLETE! Action will now save to GitHub!`);
    await browser.close();
})();
