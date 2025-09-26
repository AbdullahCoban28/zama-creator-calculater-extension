function scrapeTweetData() {
    // Sayısal metinleri (örn: "1,2B", "1,5 Mn", "1.234") sayıya çeviren yardımcı fonksiyon
    const parseNumber = (text) => {
        if (!text) return 0;
        // Türkçe "B" (Bin) ve "Mn" (Milyon) kısaltmalarını İngilizce'ye çevir
        text = text.replace(/b/gi, 'k').replace(/mn/gi, 'm');
        // Virgülü ondalık ayırıcı olarak kabul et, noktayı binlik ayırıcı olarak kaldır
        text = text.replace(/\./g, '').replace(',', '.');
        
        let multiplier = 1;
        if (text.toLowerCase().includes('k')) {
            multiplier = 1000;
        } else if (text.toLowerCase().includes('m')) {
            multiplier = 1000000;
        }
        const number = parseFloat(text);
        return isNaN(number) ? 0 : Math.round(number * multiplier);
    };

    // Belirli bir metni içeren aria-label'dan sayıyı çeken fonksiyon
    const getStatFromAriaLabel = (labelPart) => {
        try {
            // Tüm sayfadaki aria-label'ları ara
            const elements = document.querySelectorAll('[aria-label]');
            for (const el of elements) {
                const label = el.getAttribute('aria-label').toLowerCase();
                if (label.includes(labelPart.toLowerCase())) {
                    // Sayıyı bul ve parse et (örn: "70 beğeni")
                    const match = label.match(/(\d[\d,\.]*)/);
                    if (match) return parseNumber(match[1]);
                }
            }
            return 0;
        } catch (e) {
            return 0;
        }
    };
    
    // Bazen tüm veriler tek bir ana etikette toplanır
    const mainGroupElement = document.querySelector('div[role="group"][aria-label*="görüntülenme"]');
    let mainLabel = mainGroupElement ? mainGroupElement.getAttribute('aria-label') : '';

    const extractFromMainLabel = (labelPart) => {
        const regex = new RegExp(`(\\d[\\d,.]*)\\s+${labelPart}`, 'i');
        const match = mainLabel.match(regex);
        return match ? parseNumber(match[1]) : 0;
    };


    const data = {
        url: window.location.href,
        // Ana etiketten verileri çekmeyi dene
        impressions: extractFromMainLabel('görüntülenme'),
        likes: extractFromMainLabel('beğeni'),
        retweets: getStatFromAriaLabel('yeniden gönderi'), // Retweet'ler genellikle ayrıdır
        quotes: getStatFromAriaLabel('alıntı'), // Alıntılar genellikle ayrıdır
    };

    // Eğer ana etiketten çekilemediyse, tek tek butonlardan bulmayı dene
    if (data.impressions === 0) {
        data.impressions = getStatFromAriaLabel('görüntülenme');
    }
    if (data.likes === 0) {
        data.likes = getStatFromAriaLabel('beğeni');
    }


    return data;
}

// Popup'a verileri gönder
chrome.runtime.sendMessage({ type: "TWEET_DATA", data: scrapeTweetData() });

