let mediaRecorder;
let audioChunks = [];
let loopAudio = null;
let isRecording = false;
let startTime;
let timerInterval;
let progressInterval;

// --- Función de cuenta atrás (Sincronizada con puntos visuales) ---
window.startMetronome = function(callback) {
    let counts = 0;
    const status = document.getElementById('metronomeStatus');
    const bpmInput = document.getElementById('bpmInput');
    const currentBpm = bpmInput ? bpmInput.value : 100;
    const intervalMs = 60000 / currentBpm;
    const dots = document.querySelectorAll('.dot');

    status.innerText = "Preparando... 4";
    
    const flashDot = (index) => {
        const dotIdx = index % 4; // Aseguramos que siempre apunte a 0, 1, 2, 3
        if (dots[dotIdx]) {
            dots.forEach(d => d.style.background = '#444'); // Apagar todos
            dots[dotIdx].style.background = 'var(--note-root)'; // Iluminar actual
            setTimeout(() => {
                dots[dotIdx].style.background = '#444';
            }, 150); // Destello rápido para mayor precisión visual
        }
    };

    // PRIMER GOLPE (El número 4)
    flashDot(0);
    window.playClickSound(440);

    const interval = setInterval(() => {
        counts++;
        
        if (counts < 4) {
            // GOLPES 3, 2, 1
            status.innerText = `Preparando... ${4 - counts}`;
            flashDot(counts);
            // El golpe previo a grabar (cuando dice 1) es más agudo
            window.playClickSound(counts === 3 ? 880 : 440);
        } else {
            // ¡MOMENTO EXACTO DE ENTRADA!
            clearInterval(interval);
            status.innerText = "¡GRABANDO!";
            // Ejecutamos el inicio de grabación sin esperar un ciclo extra
            callback();
        }
    }, intervalMs);
};

// --- Función para formatear el tiempo (00:00) ---
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// --- Detener Grabación (Global) ---
window.stopRecording = function() {
    isRecording = false;
    document.getElementById('recDot').classList.remove('active');
    document.getElementById('metronomeStatus').innerText = "";
    
    const container = document.getElementById('progressContainer');
    const bar = document.getElementById('progressBar');
    if(container) container.style.display = 'none';
    if(bar) bar.style.backgroundColor = 'var(--accent)'; 
    
    clearInterval(timerInterval);
    clearInterval(progressInterval);
    timerInterval = null;
    progressInterval = null;
    
    if (mediaRecorder && mediaRecorder.state !== "inactive"){
        mediaRecorder.stop();
    }
};

// --- Iniciar/Parar Grabación ---
window.toggleRecord = async function() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
            });

            window.startMetronome(() => {
                isRecording = true;
                audioChunks = [];
                
                // Iniciar el metrónomo visual de la aplicación principal
                if (!window.isMetroRunning) window.toggleMetronome();
                
                document.getElementById('recDot').classList.add('active');
                
                const bpm = parseInt(document.getElementById('bpmInput').value) || 100;
                const bars = parseInt(document.getElementById('loopBars').value);
                const msPerBeat = 60000 / bpm;
                const totalMs = msPerBeat * 4 * bars;

                startTime = Date.now();
                document.getElementById('loopTimer').innerText = "00:00";
                
                if (bars > 0) {
                    const bar = document.getElementById('progressBar');
                    document.getElementById('progressContainer').style.display = 'block';
                    bar.style.width = "0%";
                    
                    progressInterval = setInterval(() => {
                        const elapsed = Date.now() - startTime;
                        const percent = (elapsed / totalMs) * 100;
                        bar.style.width = Math.min(percent, 100) + "%";

                        // Alerta visual: último compás en rojo
                        if (totalMs - elapsed < (msPerBeat * 4)) {
                            bar.style.backgroundColor = "#e74c3c";
                        }
                    }, 50);

                    setTimeout(() => {
                        if (isRecording) window.stopRecording();
                    }, totalMs);
                }

                timerInterval = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    document.getElementById('loopTimer').innerText = formatTime(elapsed);
                }, 1000);

                // Configurar y arrancar MediaRecorder
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    saveAndPlayLoop();
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start();
            });
        } catch (err) {
            alert("Error: No se pudo acceder al micrófono. " + err);
        }
    } else {
        window.stopRecording();
    }
};

// --- Limpiar todo ---
window.clearLoop = () => { 
    window.stopLoop(); 
    loopAudio = null;
    if (timerInterval) clearInterval(timerInterval);
    if (progressInterval) clearInterval(progressInterval);
    if (window.isMetroRunning) window.toggleMetronome();
   
    document.getElementById('btnPlay').disabled = true; 
    document.getElementById('loopTimer').innerText = "00:00";
    const bar = document.getElementById('progressBar');
    if(bar) {
        bar.style.width = "0%";
        bar.style.backgroundColor = 'var(--accent)';
    }
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('metronomeStatus').innerText = "Listo para grabar";
};

// --- Audio Engine ---
window.playClickSound = function(freq) {
    if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = window.audioCtx.createOscillator();
    const gain = window.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(window.audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, window.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(window.audioCtx.currentTime + 0.1);
};

function saveAndPlayLoop() {
    const blob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
    const url = URL.createObjectURL(blob);
    if (loopAudio) loopAudio.pause();
    loopAudio = new Audio(url);
    loopAudio.loop = true;
    document.getElementById('btnPlay').disabled = false;
    loopAudio.play();
}

window.playLoop = () => { if (loopAudio) loopAudio.play(); };
window.stopLoop = () => { if (loopAudio) { loopAudio.pause(); loopAudio.currentTime = 0; } };
