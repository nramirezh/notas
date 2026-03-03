let mediaRecorder;
let audioChunks = [];
let loopAudio = null;
let isRecording = false;
let startTime;
let timerInterval;
let progressInterval;

// --- Función de cuenta atrás (Global) ---
window.startMetronome = function(callback) {
    let counts = 0;
    const status = document.getElementById('metronomeStatus');
    const bpmInput = document.getElementById('bpmInput');
    const currentBpm = bpmInput ? bpmInput.value : 100;
    const intervalMs = 60000 / currentBpm;

    status.innerText = "Preparando... 4";
    
    const interval = setInterval(() => {
        counts++;
        status.innerText = `Preparando... ${4 - counts}`;
        window.playClickSound(counts === 4 ? 880 : 440); 
        
        if (counts === 4) {
            clearInterval(interval);
            status.innerText = "¡GRABANDO!";
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
    
    // Ocultar barra y resetear color
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
                document.getElementById('recDot').classList.add('active');
                
                const bpm = parseInt(document.getElementById('bpmInput').value) || 100;
                const bars = parseInt(document.getElementById('loopBars').value);
                const msPerBeat = 60000 / bpm;
                const msPerBar = msPerBeat * 4;
                const totalMs = msPerBar * bars;

                startTime = Date.now();
                document.getElementById('loopTimer').innerText = "00:00";
                
                // Configuración de Barra de Progreso
                if (bars > 0) {
                    const bar = document.getElementById('progressBar');
                    document.getElementById('progressContainer').style.display = 'block';
                    bar.style.width = "0%";
                    
                    progressInterval = setInterval(() => {
                        const elapsed = Date.now() - startTime;
                        const percent = (elapsed / totalMs) * 100;
                        bar.style.width = Math.min(percent, 100) + "%";

                        // ALERTA VISUAL: Si queda menos de 1 compás, se pone roja
                        if (totalMs - elapsed < msPerBar) {
                            bar.style.backgroundColor = "#e74c3c"; // Rojo alerta
                        }
                    }, 50);

                    // Auto-stop matemático
                    setTimeout(() => {
                        if (isRecording) window.stopRecording();
                    }, totalMs);
                }

                timerInterval = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    document.getElementById('loopTimer').innerText = formatTime(elapsed);
                }, 1000);

                if (!window.isMetroRunning) window.toggleMetronome();

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
