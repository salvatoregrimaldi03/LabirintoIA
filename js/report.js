// js/report.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Recupera Dati
    const rawData = localStorage.getItem('battleshipReport');
    
    if (!rawData) {
        alert("Nessun dato di battaglia trovato. Esegui prima una simulazione.");
        window.location.href = 'ai_vs_ai.html';
        return;
    }

    const data = JSON.parse(rawData);
    
    // 2. Popola UI
    document.getElementById('report-date').innerText = `DATA: ${data.timestamp}`;
    document.getElementById('total-turns').innerText = data.turns;
    
    const winnerSpan = document.getElementById('winner-name');
    winnerSpan.innerText = `IA_${data.winner}`;
    winnerSpan.style.color = (data.winner === 'A') ? '#00f2ff' : '#ff0055';
    
    document.getElementById('algo-a').innerText = data.stats.A.algo;
    document.getElementById('algo-b').innerText = data.stats.B.algo;

    const totalShotsA = data.stats.A.hits + data.stats.A.misses;
    const accA = totalShotsA > 0 ? ((data.stats.A.hits / totalShotsA) * 100).toFixed(1) : 0;
    document.getElementById('acc-a').innerText = `${accA}%`;

    const totalShotsB = data.stats.B.hits + data.stats.B.misses;
    const accB = totalShotsB > 0 ? ((data.stats.B.hits / totalShotsB) * 100).toFixed(1) : 0;
    document.getElementById('acc-b').innerText = `${accB}%`;

    // 3. Grafici
    const commonOptions = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: { duration: 1500 }
    };

    new Chart(document.getElementById('chartA'), {
        type: 'doughnut',
        data: {
            labels: ['Colpito', 'Acqua'],
            datasets: [{
                data: [data.stats.A.hits, data.stats.A.misses],
                backgroundColor: ['#00f2ff', '#0b2326'],
                borderColor: '#00f2ff',
                borderWidth: 1
            }]
        },
        options: { cutout: '75%', ...commonOptions }
    });

    new Chart(document.getElementById('chartB'), {
        type: 'doughnut',
        data: {
            labels: ['Colpito', 'Acqua'],
            datasets: [{
                data: [data.stats.B.hits, data.stats.B.misses],
                backgroundColor: ['#ff0055', '#330b15'],
                borderColor: '#ff0055',
                borderWidth: 1
            }]
        },
        options: { cutout: '75%', ...commonOptions }
    });

    new Chart(document.getElementById('comparisonChart'), {
        type: 'bar',
        data: {
            labels: ['Colpi a Segno', 'Colpi a Vuoto'],
            datasets: [
                {
                    label: 'IA A',
                    data: [data.stats.A.hits, data.stats.A.misses],
                    backgroundColor: 'rgba(0, 242, 255, 0.7)',
                    borderColor: '#00f2ff',
                    borderWidth: 1
                },
                {
                    label: 'IA B',
                    data: [data.stats.B.hits, data.stats.B.misses],
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

    // 4. Download PDF
    document.getElementById('download-pdf').addEventListener('click', () => {
        const element = document.getElementById('pdf-content');
        const opt = {
            margin:       0.3,
            filename:     `Mission_Report_${Date.now()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, backgroundColor: '#050a10', useCORS: true }, 
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        
        const btn = document.getElementById('download-pdf');
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
});
