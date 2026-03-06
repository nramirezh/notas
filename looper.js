let mediaRecorder;
let audioChunks = [];
let loopAudio = null;
let isRecording = false;
let startTime;
let timerInterval;
let progressInterval;

window.startMetronome = function(callback) {
    let counts = 0;
    const status = document.getElementById('metronomeStatus');
    const bpm = document.getElementById('bpmInput').value || 100;
    const intervalMs = 60000 / bpm;

    // 1. Iniciamos el primer tiempo de la cuenta atrás (Paso 0)
    window.metroStep = 0;
    if (typeof updateDots === 'function') updateDots();
    window.playClickSound(440);

    status.innerText = "Preparando... 4";
    
    const interval = setInterval(() => {
        counts++;
        
        if (counts < 4) {
            // 2. Tiempos 3, 2, 1 de la cuenta atrás
            status.innerText = `Preparando... ${4 - counts}`;
            window.metroStep = counts; // Sincronizamos el paso visual
            if (typeof updateDots === 'function') updateDots();
            
            // El último golpe (cuando dice 1) es más agudo
            window.playClickSound(counts === 3 ? 880 : 440);
        } else {
            // 3. MOMENTO DE ENTRADA A GRABACIÓN
            clearInterval(interval);
            
            // IMPORTANTE: No llamamos a resetDots() aquí para evitar que la luz se apague.
            // La función callback() se encargará de arrancar startMetro() 
            // que pintará el nuevo Tiempo 1 al instante.
            
            status.innerText = "¡GRABANDO!";
            callback();
        }
    }, intervalMs);
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
                
                // --- CLAVE PARA LA SINCRONÍA DE LA LUZ ---
                // Si el metrónomo ya estaba corriendo, lo paramos y lo volvemos a arrancar
                // para que el índice de los puntos se resetee a 0 en este preciso instante.
                if (window.isMetroRunning) {
                    window.toggleMetronome(); // Lo para
                }
                window.toggleMetronome(); // Lo arranca desde el punto 1
                
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
    if(container) container.style.display = 'none';
    
    clearInterval(timerInterval);
    clearInterval(progressInterval);
    
    // IMPORTANTE: Detener el metrónomo y apagar luces
    window.isMetroRunning = false;
    const btn = document.getElementById('metroPlayBtn');
    if (btn) btn.innerText = "▶";
    if (typeof resetDots === 'function') resetDots();
    
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
                if (window.isMetroRunning) {
                    window.toggleMetronome(); // Apaga
                }
                window.toggleMetronome(); // Enciende (y arranca en 0 gracias al cambio anterior)
                          
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
