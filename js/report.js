document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. RECUPERO DATI DAL LOCAL STORAGE
    // ---------------------------------------------------------
    const rawData = localStorage.getItem('battleshipReport');
    
    if (!rawData) {
        alert("Nessun dato di battaglia trovato. Esegui prima una simulazione o una partita.");
        window.location.href = 'index.html';
        return;
    }

    const data = JSON.parse(rawData);

    // Determina la modalità: 'HVA' (Umano vs IA) o default (IA vs IA)
    const isHvA = data.params && data.params.mode === 'HVA';

    // ---------------------------------------------------------
    // 2. POPOLAMENTO UI (TESTI)
    // ---------------------------------------------------------
    document.getElementById('report-date').innerText = `DATA: ${data.timestamp || new Date().toLocaleDateString()}`;
    document.getElementById('total-turns').innerText = data.turns ?? 0;
    
    const winnerSpan = document.getElementById('winner-name');

    // Variabili per i dati statistici
    let labelA = "AGENTE A";
    let labelB = "AGENTE B";
    let colorA = "#00f2ff"; // Ciano
    let colorB = "#ff0055"; // Rosso Neon

    if (isHvA) {
        // --- Human vs AI ---
        labelA = "UTENTE";
        labelB = data.params.iaDifficultyLabel || (data.stats.B && data.stats.B.algo) || 'IA';

        if (data.winner === 'A') {
            winnerSpan.innerText = labelA + " (VITTORIA)";
            winnerSpan.style.color = colorA;
        } else {
            winnerSpan.innerText = "IA (VITTORIA)";
            winnerSpan.style.color = colorB;
        }
    } else {
        // --- IA vs IA ---
        labelA = (data.stats && data.stats.A && data.stats.A.algo) ? data.stats.A.algo : 'IA_A';
        labelB = (data.stats && data.stats.B && data.stats.B.algo) ? data.stats.B.algo : 'IA_B';
        
        const winner = data.winner || '?';
        winnerSpan.innerText = (winner === 'A') ? `${labelA} HA VINTO` : `${labelB} HA VINTO`;
        winnerSpan.style.color = (winner === 'A') ? colorA : colorB;
    }

    // Inserisci etichette nel DOM
    document.getElementById('algo-a').innerText = labelA;
    document.getElementById('algo-b').innerText = labelB;

    // ---------------------------------------------------------
    // 3. CALCOLO STATISTICHE
    // ---------------------------------------------------------
    // Funzione helper per evitare crash su dati mancanti
    const getStats = (statsObj) => {
        const hits = (statsObj && statsObj.hits) ? Number(statsObj.hits) : 0;
        const misses = (statsObj && statsObj.misses) ? Number(statsObj.misses) : 0;
        return { hits, misses, total: hits + misses };
    };

    const statsA = getStats(data.stats ? data.stats.A : null);
    const statsB = getStats(data.stats ? data.stats.B : null);

    // Calcolo percentuali
    const accA = statsA.total > 0 ? ((statsA.hits / statsA.total) * 100).toFixed(1) : '0.0';
    const accB = statsB.total > 0 ? ((statsB.hits / statsB.total) * 100).toFixed(1) : '0.0';

    document.getElementById('acc-a').innerText = `${accA}%`;
    document.getElementById('acc-b').innerText = `${accB}%`;

    // ---------------------------------------------------------
    // 4. GENERAZIONE GRAFICI (CHART.JS)
    // ---------------------------------------------------------
    
    // Opzioni comuni: IMPORTANTISSIMO 'animation: false' per il PDF
    // Se c'è l'animazione, il PDF viene generato mentre il grafico è vuoto o a metà.
    const chartConfig = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // DISABILITA ANIMAZIONI PER STAMPA ISTANTANEA
        plugins: { 
            legend: { display: false },
            tooltip: { enabled: false } // Rimuovi tooltip per pulizia statica
        }
    };

    // --- Chart A (Doughnut) ---
    new Chart(document.getElementById('chartA'), {
        type: 'doughnut',
        data: {
            labels: ['Colpito', 'Acqua'],
            datasets: [{
                data: [statsA.hits, statsA.misses],
                backgroundColor: [colorA, '#0b2326'],
                borderColor: colorA,
                borderWidth: 1
            }]
        },
        options: { cutout: '70%', ...chartConfig }
    });

    // --- Chart B (Doughnut) ---
    new Chart(document.getElementById('chartB'), {
        type: 'doughnut',
        data: {
            labels: ['Colpito', 'Acqua'],
            datasets: [{
                data: [statsB.hits, statsB.misses],
                backgroundColor: [colorB, '#330b15'],
                borderColor: colorB,
                borderWidth: 1
            }]
        },
        options: { cutout: '70%', ...chartConfig }
    });

    // --- Comparison Chart (Bar) ---
    new Chart(document.getElementById('comparisonChart'), {
        type: 'bar',
        data: {
            labels: ['Colpi a Segno', 'Colpi a Vuoto'],
            datasets: [
                {
                    label: labelA,
                    data: [statsA.hits, statsA.misses],
                    backgroundColor: 'rgba(0, 242, 255, 0.6)',
                    borderColor: colorA,
                    borderWidth: 1
                },
                {
                    label: labelB,
                    data: [statsB.hits, statsB.misses],
                    backgroundColor: 'rgba(255, 0, 85, 0.6)',
                    borderColor: colorB,
                    borderWidth: 1
                }
            ]
        },
        options: {
            animation: false, // CRUCIALE
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#ccc', font: { family: 'monospace' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#fff', font: { family: 'monospace' } }
                }
            },
            plugins: {
                legend: { 
                    display: true,
                    labels: { color: '#fff', font: { family: 'monospace' } } 
                }
            }
        }
    });

    // ---------------------------------------------------------
    // 5. FUNZIONE DOWNLOAD PDF
    // ---------------------------------------------------------
    const downloadBtn = document.getElementById('download-pdf');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const element = document.getElementById('pdf-content');
            
            // Configurazione avanzata per html2pdf
            const opt = {
                margin:       [10, 10, 10, 10], // Margini (mm)
                filename:     `Mission_Report_${Date.now()}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 3, // Alta risoluzione (elimina testo sfocato)
                    backgroundColor: '#050a10', // Forza lo sfondo scuro
                    useCORS: true, // Se usi immagini esterne
                    scrollY: 0, // Ignora lo scroll dell'utente al momento del click
                    windowWidth: document.documentElement.offsetWidth // Assicura larghezza corretta
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            // Feedback visivo sul bottone
            const originalText = downloadBtn.innerText;
            downloadBtn.innerText = "GENERAZIONE IN CORSO...";
            downloadBtn.style.opacity = "0.7";
            downloadBtn.disabled = true;
            
            // Scrolla in alto per sicurezza (aiuta html2canvas)
            window.scrollTo(0,0);

            // Genera e Salva
            html2pdf().set(opt).from(element).save().then(() => {
                // Ripristina bottone
                downloadBtn.innerText = originalText;
                downloadBtn.style.opacity = "1";
                downloadBtn.disabled = false;
            }).catch(err => {
                console.error("Errore PDF:", err);
                downloadBtn.innerText = "ERRORE";
                setTimeout(() => {
                    downloadBtn.innerText = originalText;
                    downloadBtn.disabled = false;
                }, 3000);
            });
        });
    }
});
