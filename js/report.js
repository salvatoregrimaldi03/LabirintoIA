// js/report.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Recupera Dati
    const rawData = localStorage.getItem('battleshipReport');
    
    if (!rawData) {
        alert("Nessun dato di battaglia trovato. Esegui prima una simulazione o una partita.");
        // fallback: torna alla home (index) per le H vs AI o ad IA vs IA
        window.location.href = 'index.html';
        return;
    }

    const data = JSON.parse(rawData);

    // Determine mode: AI vs AI if no params.mode === 'HVA'
    const isHvA = data.params && data.params.mode === 'HVA';

    // 2. Popola UI
    document.getElementById('report-date').innerText = `DATA: ${data.timestamp || '---'}`;
    document.getElementById('total-turns').innerText = data.turns ?? 0;
    
    const winnerSpan = document.getElementById('winner-name');

    if (isHvA) {
        // Human vs AI: AGENTE A = UTENTE (BLUE), AGENTE B = IA (RED)
        const humanLabel = 'UTENTE';
        const aiLabel = data.params.iaDifficultyLabel || data.stats.B?.algo || 'IA';

        // Winner
        if (data.winner === 'A') {
            winnerSpan.innerText = humanLabel;
            winnerSpan.style.color = '#00f2ff';
        } else {
            winnerSpan.innerText = 'IA';
            winnerSpan.style.color = '#ff0055';
        }

        // algos
        document.getElementById('algo-a').innerText = humanLabel;
        document.getElementById('algo-b').innerText = aiLabel;

    } else {
        // IA vs IA (legacy)
        const winner = data.winner || '?';
        winnerSpan.innerText = `IA_${winner}`;
        winnerSpan.style.color = (winner === 'A') ? '#00f2ff' : '#ff0055';

        document.getElementById('algo-a').innerText = data.stats?.A?.algo || '---';
        document.getElementById('algo-b').innerText = data.stats?.B?.algo || '---';
    }

    // Calcola accuratezze (gestiamo missing fields)
    const hitsA = (data.stats && data.stats.A && Number(data.stats.A.hits)) ? Number(data.stats.A.hits) : 0;
    const missesA = (data.stats && data.stats.A && Number(data.stats.A.misses)) ? Number(data.stats.A.misses) : 0;
    const totalA = hitsA + missesA;
    const accA = totalA > 0 ? ((hitsA / totalA) * 100).toFixed(1) : '0.0';
    document.getElementById('acc-a').innerText = `${accA}%`;

    const hitsB = (data.stats && data.stats.B && Number(data.stats.B.hits)) ? Number(data.stats.B.hits) : 0;
    const missesB = (data.stats && data.stats.B && Number(data.stats.B.misses)) ? Number(data.stats.B.misses) : 0;
    const totalB = hitsB + missesB;
    const accB = totalB > 0 ? ((hitsB / totalB) * 100).toFixed(1) : '0.0';
    document.getElementById('acc-b').innerText = `${accB}%`;

    // 3. Grafici (usiamo Chart.js)
    const commonOptions = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: { duration: 800 }
    };

    // Chart A (doughnut)
    new Chart(document.getElementById('chartA'), {
        type: 'doughnut',
        data: {
            labels: ['Colpito', 'Acqua'],
            datasets: [{
                data: [hitsA, missesA],
                backgroundColor: ['#00f2ff', '#0b2326'],
                borderColor: '#00f2ff',
                borderWidth: 1
            }]
        },
        options: { cutout: '75%', ...commonOptions }
    });

    // Chart B (doughnut)
    new Chart(document.getElementById('chartB'), {
        type: 'doughnut',
        data: {
            labels: ['Colpito', 'Acqua'],
            datasets: [{
                data: [hitsB, missesB],
                backgroundColor: ['#ff0055', '#330b15'],
                borderColor: '#ff0055',
                borderWidth: 1
            }]
        },
        options: { cutout: '75%', ...commonOptions }
    });

    // Comparison bar chart
    new Chart(document.getElementById('comparisonChart'), {
        type: 'bar',
        data: {
            labels: ['Colpi a Segno', 'Colpi a Vuoto'],
            datasets: [
                {
                    label: isHvA ? 'UTENTE' : 'IA A',
                    data: [hitsA, missesA],
                    backgroundColor: 'rgba(0, 242, 255, 0.7)',
                    borderColor: '#00f2ff',
                    borderWidth: 1
                },
                {
                    label: isHvA ? 'IA' : 'IA B',
                    data: [hitsB, missesB],
                    backgroundColor: 'rgba(255, 0, 85, 0.7)',
                    borderColor: '#ff0055',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#888' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#fff' }
                }
            },
            plugins: {
                legend: { labels: { color: '#fff' } }
            }
        }
    });

    // 4. Download PDF (stessa logica)
    const downloadBtn = document.getElementById('download-pdf');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const element = document.getElementById('pdf-content');
            const opt = {
                margin:       0.3,
                filename:     `Mission_Report_${Date.now()}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, backgroundColor: '#050a10', useCORS: true }, 
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            
            const btn = downloadBtn;
            const originalText = btn.innerText;
            btn.innerText = "GENERAZIONE PDF...";
            btn.style.opacity = "0.7";
            btn.disabled = true;
    
            html2pdf().set(opt).from(element).save().then(() => {
                btn.innerText = originalText;
                btn.style.opacity = "1";
                btn.disabled = false;
            });
        });
    }
});
