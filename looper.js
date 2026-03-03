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

//--- MINUTERO ---
let startTime;
let timerInterval;

// --- Función para formatear el tiempo (00:00) ---
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// --- Modifica window.toggleRecord ---
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
                
                const bpm = document.getElementById('bpmInput').value || 100;
                const bars = parseInt(document.getElementById('loopBars').value);
                const msPerBeat = 60000 / bpm;
                const totalMs = msPerBeat * 4 * bars;

                // --- INICIAR CRONÓMETRO Y BARRA ---
                startTime = Date.now();
                document.getElementById('loopTimer').innerText = "00:00";
                
                // Mostrar y resetear barra si hay compases definidos
                if (bars > 0) {
                    const bar = document.getElementById('progressBar');
                    document.getElementById('progressContainer').style.display = 'block';
                    bar.style.width = "0%";
                    
                    progressInterval = setInterval(() => {
                        const elapsed = Date.now() - startTime;
                        const percent = (elapsed / totalMs) * 100;
                        bar.style.width = Math.min(percent, 100) + "%";
                    }, 50); // Actualización fluida cada 50ms
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
                
                // --- STOP AUTOMÁTICO ---
                if (bars > 0) {
                    setTimeout(() => {
                        if (isRecording) {
                            window.stopRecording(); // Llamada global
                            console.log(`Auto-stop: ${bars} compases.`);
                        }
                    }, totalMs);
                }
            });
        } catch (err) {
            alert("Error: " + err);
        }
    } else {
        window.stopRecording();
    }
};
window.stopRecording = function() {
    isRecording = false;
    document.getElementById('recDot').classList.remove('active');
    document.getElementById('metronomeStatus').innerText = "";
    document.getElementById('progressContainer').style.display = 'none'; // Escondemos barra
    
    clearInterval(timerInterval);
    clearInterval(progressInterval);
    timerInterval = null;
    progressInterval = null;
    
    if (mediaRecorder && mediaRecorder.state !== "inactive"){
        mediaRecorder.stop();
    }
};
/* --- Modifica stopRecording ---
function stopRecording() {
    isRecording = false;
    document.getElementById('recDot').classList.remove('active');
    document.getElementById('metronomeStatus').innerText = "";
    
    // --- DETENER CRONÓMETRO ---
    clearInterval(timerInterval);
    timerInterval = null;
    // El tiempo se queda fijo en lo que duró la grabación
    
    if (mediaRecorder && mediaRecorder.state !== "inactive"){
        mediaRecorder.stop();
    }
}*/

// --- Modifica clearLoop para resetear el reloj ---
window.clearLoop = () => { 
    window.stopLoop(); 
    loopAudio = null;
    if (timerInterval) clearInterval(timerInterval);
    if (progressInterval) clearInterval(progressInterval);
    if (window.isMetroRunning) window.toggleMetronome();
   
    document.getElementById('btnPlay').disabled = true; 
    document.getElementById('loopTimer').innerText = "00:00";
    document.getElementById('progressBar').style.width = "0%";
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('metronomeStatus').innerText = "Listo para grabar";
};

// --- Sonido del click (Global) ---
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

// Funciones para los otros botones
window.playLoop = () => { if (loopAudio) loopAudio.play(); };
window.stopLoop = () => { if (loopAudio) { loopAudio.pause(); loopAudio.currentTime = 0; } };
window.clearLoop = () => { window.stopLoop(); loopAudio = null; document.getElementById('btnPlay').disabled = true; };
