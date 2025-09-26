// --- Zama Puan Hesaplama Fonksiyonu ---
// Web sitesindekiyle aynı.
function calculateZamaScore(data) {
    const { followers, smart_followers, impressions, likes, retweets, quotes, posts } = data;
    if (posts < 2 || impressions <= 0) return { finalScore: 0, isDisqualified: true };
    const ER_percent = ((likes + retweets + quotes) / impressions) * 100;
    const SRM = Math.min(1, impressions / 100000);
    const SF = Math.min(Math.log10(smart_followers + 1), 3.0);
    const IMP = Math.sqrt(impressions);
    const qW = 4 + 2 * SRM;
    const ENG_raw = likes + 3 * retweets + qW * quotes;
    const EngObs = Math.max(ENG_raw, (ER_percent / 100) * impressions);
    const ER_cap = 0.01 + 0.04 * SRM;
    const EffEng = Math.min(EngObs, impressions * ER_cap);
    const Clamp = EngObs > 0 ? EffEng / EngObs : 1;
    const SENG = Math.min(smart_followers, 0.5 * EffEng);
    const QE = Math.min(Math.log(1 + impressions / Math.max(followers, 1)), 2.0) * SRM;
    const postMult = 1 + 0.02 * Math.min(posts, 20);
    const erMult = 0.90 + 2 * Math.min(ER_percent / 100, 0.05);
    let finalScore;
    if (ER_percent > 20) {
        finalScore = 0;
    } else {
        const engageBlock = ((ENG_raw * 0.7) * Clamp + (SENG * 150)) * Math.pow(SRM, 1.5);
        const baseScore = (SF * 500) + (IMP * 10) + engageBlock + (QE * 120);
        finalScore = baseScore * erMult * postMult;
        if (ER_percent > 10 && impressions < 50000) finalScore *= 0.30;
    }
    return {
        finalScore: finalScore.toFixed(2),
        isDisqualified: ER_percent > 20 || finalScore == 0,
    };
}


document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    const saveBtn = document.getElementById('saveBtn'); 
    const resultDiv = document.getElementById('result');
    const smartFollowersInput = document.getElementById('smartFollowers');
    const totalFollowersInput = document.getElementById('totalFollowers');

    // Kaydedilmiş takipçi sayılarını yükle
    chrome.storage.sync.get(['smartFollowers', 'totalFollowers'], (data) => {
        if (data.smartFollowers) smartFollowersInput.value = data.smartFollowers;
        if (data.totalFollowers) totalFollowersInput.value = data.totalFollowers;
    });

    // Aktif sekmeye mesaj göndererek tweet verilerini iste
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content_script.js']
        });
    });

    // Content script'ten gelen verileri dinle
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "TWEET_DATA") {
            document.getElementById('tweetURL').textContent = message.data.url.substring(0, 30) + "...";
            document.getElementById('impressions').textContent = message.data.impressions || "Not found";
            document.getElementById('likes').textContent = message.data.likes || "Not found";
            document.getElementById('retweets').textContent = message.data.retweets || "Not found";
            document.getElementById('quotes').textContent = message.data.quotes || "Not found";
        }
    });

    // Kaydet butonuna tıklandığında çalışacak fonksiyon
    saveBtn.addEventListener('click', () => {
        const smartFollowers = parseInt(smartFollowersInput.value, 10) || 0;
        const totalFollowers = parseInt(totalFollowersInput.value, 10) || 0;

        chrome.storage.sync.set({ smartFollowers, totalFollowers }, () => {
            // Kullanıcıya geri bildirim ver
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saved!';
            saveBtn.style.backgroundColor = '#28a745'; 
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.backgroundColor = '#6c757d'; 
            }, 1500);
        });
    });

    calculateBtn.addEventListener('click', () => {
        // Değerleri al ve hesapla
        const smartFollowers = parseInt(smartFollowersInput.value, 10) || 0;
        const totalFollowers = parseInt(totalFollowersInput.value, 10) || 0;
        
        // Hesapla butonuna basıldığında da takipçi sayılarını kaydet (kullanıcı unutursa diye)
        chrome.storage.sync.set({ smartFollowers, totalFollowers });

        const scoreData = {
            impressions: parseInt(document.getElementById('impressions').textContent, 10) || 0,
            likes: parseInt(document.getElementById('likes').textContent, 10) || 0,
            retweets: parseInt(document.getElementById('retweets').textContent, 10) || 0,
            quotes: parseInt(document.getElementById('quotes').textContent, 10) || 0,
            followers: totalFollowers,
            smart_followers: smartFollowers,
            posts: 20 
        };

        const result = calculateZamaScore(scoreData);
        resultDiv.innerHTML = `
            <p><strong>Zama Score: ${result.finalScore}</strong></p>
            <p style="color: ${result.isDisqualified ? 'red' : 'green'};">
                ${result.isDisqualified ? 'Disqualified' : 'Eligible'}
            </p>
        `;
    });
});

