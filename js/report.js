// js/report.js
// Generazione report + PDF: legge il parametro URL per decidere quale report mostrare
document.addEventListener('DOMContentLoaded', () => {
    
    // 1) GESTIONE CHIAVE DI LETTURA (MODIFICATA)
    // Leggiamo il parametro ?type=... dall'URL per sapere quale report caricare
    const params = new URLSearchParams(window.location.search);
    const reportType = params.get('type'); // 'viewing', 'current', o null (default)

    let storageKey = 'battleshipReport'; // Default: Ultimo Report (Storico)

    if (reportType === 'viewing') {
        // Carica il report temporaneo che stiamo visualizzando ora
        storageKey = 'battleshipReport_viewing';
    } else if (reportType === 'current') {
        // Fallback per compatibilità
        storageKey = 'battleshipReport_current';
    }

    console.log(`Caricamento report. Tipo: ${reportType}, Chiave: ${storageKey}`);

    const rawData = localStorage.getItem(storageKey);
    if (!rawData) {
        alert("Nessun dato di battaglia trovato per la tipologia richiesta.");
        // Se manca il report specifico, proviamo a tornare alla home o chiudere
        window.close(); 
        return;
    }

    const data = JSON.parse(rawData);
    const isHvA = data.params && data.params.mode === 'HVA';

    // 2) Popolamento UI
    document.getElementById('report-date').innerText = `DATA: ${data.timestamp || new Date().toLocaleDateString()}`;
    
    // Aggiungiamo un indicatore visivo nel titolo se è uno storico o quello attuale (Opzionale ma utile)
    /*
    if (reportType === 'viewing' || reportType === 'current') {
        document.querySelector('.subtitle').innerText += " (CORRENTE)";
    } else {
        document.querySelector('.subtitle').innerText += " (ARCHIVIO)";
    }
    */

    document.getElementById('total-turns').innerText = data.turns ?? 0;

    const winnerSpan = document.getElementById('winner-name');
    let labelA = "AGENTE A", labelB = "AGENTE B";
    const colorA = "#00f2ff", colorB = "#ff0055";

    if (isHvA) {
        labelA = "UTENTE";
        labelB = data.params.iaDifficultyLabel || (data.stats && data.stats.B && data.stats.B.algo) || 'IA';
        winnerSpan.innerText = (data.winner === 'A') ? `${labelA} (VITTORIA)` : `IA (VITTORIA)`;
        winnerSpan.style.color = (data.winner === 'A') ? colorA : colorB;
    } else {
        labelA = (data.stats && data.stats.A && data.stats.A.algo) ? data.stats.A.algo : 'IA_A';
        labelB = (data.stats && data.stats.B && data.stats.B.algo) ? data.stats.B.algo : 'IA_B';
        const winner = data.winner || '?';
        winnerSpan.innerText = (winner === 'A') ? `${labelA} HA VINTO` : `${labelB} HA VINTO`;
        winnerSpan.style.color = (winner === 'A') ? colorA : colorB;
    }

    document.getElementById('algo-a').innerText = labelA;
    document.getElementById('algo-b').innerText = labelB;

    const getStats = s => {
        const hits = s && s.hits ? Number(s.hits) : 0;
        const misses = s && s.misses ? Number(s.misses) : 0;
        return { hits, misses, total: hits + misses };
    };
    const statsA = getStats(data.stats && data.stats.A);
    const statsB = getStats(data.stats && data.stats.B);
    const accA = statsA.total > 0 ? ((statsA.hits / statsA.total) * 100).toFixed(1) : '0.0';
    const accB = statsB.total > 0 ? ((statsB.hits / statsB.total) * 100).toFixed(1) : '0.0';

    document.getElementById('acc-a').innerText = `${accA}%`;
    document.getElementById('acc-b').innerText = `${accB}%`;

    // 3) Doughnut charts (no border per evitare artefatti)
    const pieConfig = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } } };

    const chartA = new Chart(document.getElementById('chartA'), {
        type: 'doughnut',
        data: { labels: ['Colpito', 'Acqua'], datasets: [{ data: [statsA.hits, statsA.misses], backgroundColor: [colorA, '#0b2326'], borderColor: 'transparent', borderWidth: 0 }] },
        options: { cutout: '70%', ...pieConfig }
    });

    const chartB = new Chart(document.getElementById('chartB'), {
        type: 'doughnut',
        data: { labels: ['Colpito', 'Acqua'], datasets: [{ data: [statsB.hits, statsB.misses], backgroundColor: [colorB, '#330b15'], borderColor: 'transparent', borderWidth: 0 }] },
        options: { cutout: '70%', ...pieConfig }
    });

    // 4) Comparativa (line chart)
    const history = data.history || [];
    const turns = data.turns || 0;
    let datasetA = [{ x: 0, y: 0 }], datasetB = [{ x: 0, y: 0 }];
    let cumA = 0, cumB = 0;
    history.forEach(evt => {
        if (evt.shooter === 'A') { if (evt.isHit) cumA++; datasetA.push({ x: evt.turn, y: cumA }); }
        else { if (evt.isHit) cumB++; datasetB.push({ x: evt.turn, y: cumB }); }
    });
    datasetA.push({ x: turns, y: cumA });
    datasetB.push({ x: turns, y: cumB });

    const comparisonChart = new Chart(document.getElementById('comparisonChart'), {
        type: 'line',
        data: { datasets: [
            { label: labelA, data: datasetA, borderColor: colorA, backgroundColor: colorA, borderWidth: 2, tension: 0.1, pointRadius: 3 },
            { label: labelB, data: datasetB, borderColor: colorB, backgroundColor: colorB, borderWidth: 2, tension: 0.1, pointRadius: 3 }
        ] },
        options: {
            animation: false, responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, labels: { color: '#fff', font: { family: 'monospace' } } },
                tooltip: {
                    enabled: true, backgroundColor: 'rgba(5,10,16,0.9)', titleColor: '#fff', bodyColor: '#ccc',
                    borderColor: '#fff', borderWidth: 1, displayColors: true,
                    callbacks: {
                        title: ctx => 'Turno: ' + ctx[0].parsed.x,
                        label: ctx => `${ctx.dataset.label || ''}: ${ctx.parsed.y} Colpi a segno`
                    }
                }
            },
            scales: {
                x: { type: 'linear', title: { display: true, text: 'TURNI DI GIOCO', color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888', font: { family: 'monospace' } } },
                y: { beginAtZero: true, title: { display: true, text: 'NAVI COLPITE (Cumulativo)', color: '#666' }, grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#888', font: { family: 'monospace' } }, suggestedMax: 17 }
            }
        }
    });

    // 5) Download PDF
    const downloadBtn = document.getElementById('download-pdf');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            const originalText = downloadBtn.innerText;
            downloadBtn.innerText = "GENERAZIONE IN CORSO...";
            downloadBtn.disabled = true;
            downloadBtn.style.opacity = '0.7';
            try {
                await generatePdfFromElement(document.getElementById('pdf-content'));
            } catch (err) {
                console.error("Errore PDF:", err);
                alert("Errore durante la generazione del PDF. Controlla la console.");
            } finally {
                downloadBtn.innerText = originalText;
                downloadBtn.disabled = false;
                downloadBtn.style.opacity = '1';
            }
        });
    }

    /**
     * Clona off-screen (left:-9999px) per preservare layout,
     * rimuove decorazioni (scanline, controls-area),
     * sostituisce canvas con immagini usando le dimensioni reali della UI,
     * poi chiama html2pdf senza forzare width (per evitare distortions).
     */
    async function generatePdfFromElement(element) {
        if (!element) throw new Error("Elemento PDF non trovato");

        // Clona
        const clone = element.cloneNode(true);

        // Rimuovi decorazioni nella copia (scanline, controls)
        const unwanted = clone.querySelectorAll('.scanline, .controls-area');
        unwanted.forEach(n => n.parentNode && n.parentNode.removeChild(n));

        // Container off-screen (left:-9999px) per garantire rendering reale
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = element.offsetWidth + 'px';
        container.style.opacity = '1';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '999999';
        container.appendChild(clone);
        document.body.appendChild(container);

        // Sostituisci canvas con immagini (usando dimensioni reali del canvas)
        const origCanvases = element.querySelectorAll('canvas');
        for (let i = 0; i < origCanvases.length; i++) {
            const orig = origCanvases[i];
            if (!orig.id) continue;

            // dimensioni visive reali
            const rect = orig.getBoundingClientRect();
            let dataUrl = null;
            try {
                const ch = (typeof Chart !== 'undefined' && Chart.getChart) ? Chart.getChart(orig) : null;
                if (ch && typeof ch.toBase64Image === 'function') dataUrl = ch.toBase64Image();
                else dataUrl = orig.toDataURL('image/png');
            } catch (e) {
                console.warn('Impossibile leggere canvas', orig.id, e);
                dataUrl = null;
            }

            const cloneCanvas = clone.querySelector(`#${orig.id}`);
            if (cloneCanvas) {
                const img = document.createElement('img');
                if (dataUrl) img.src = dataUrl;
                else { img.alt = 'chart'; img.style.background = '#050a10'; }
                // usa le dimensioni reali per evitare ridimensionamenti strani
                img.style.width = rect.width + 'px';
                img.style.height = rect.height + 'px';
                img.style.display = 'block';
                cloneCanvas.parentNode.replaceChild(img, cloneCanvas);
            }
        }

        // lascia il tempo al browser di caricare le immagini
        await new Promise(r => setTimeout(r, 120));

        // html2pdf options
        const scale = Math.min(3, (window.devicePixelRatio || 2));
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Mission_Report_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: scale,
                backgroundColor: '#050a10',
                useCORS: true,
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        // Genera PDF dalla copia
        await html2pdf().set(opt).from(clone).save();

        // Pulizia
        document.body.removeChild(container);
    }
});
