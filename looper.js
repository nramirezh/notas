let mediaRecorder;
let audioChunks = [];
let loopAudio = null;
let isRecording = false;

// --- Metrónomo de entrada y Grabación ---
async function toggleRecord() {
    if (!isRecording) {
        try {
            // Pedimos acceso al micro con alta fidelidad (sin filtros de voz)
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });

            startMetronome(() => {
                isRecording = true;
                audioChunks = [];
                document.getElementById('recDot').classList.add('active');
                
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    saveAndPlayLoop(); // Al parar, procesa y reproduce
                    // Cerramos el stream del micro para ahorrar recursos
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start();
            });
        } catch (err) {
            alert("No se pudo acceder al micrófono: " + err);
        }
    } else {
        stopRecording();
    }
}

function stopRecording() {
    isRecording = false;
    document.getElementById('recDot').classList.remove('active');
    document.getElementById('metronomeStatus').innerText = "";
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
}

function saveAndPlayLoop() {
    const blob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
    const url = URL.createObjectURL(blob);
    
    if (loopAudio) loopAudio.pause();

    loopAudio = new Audio(url);
    loopAudio.loop = true; // Mantiene el bucle infinito
    
    document.getElementById('btnPlay').disabled = false;
    
    // ¡LA MAGIA! Empieza a sonar solo en cuanto termina la grabación
    loopAudio.play();
}

// --- Función de cuenta atrás para el Looper ---
function startMetronome(callback) {
    let counts = 0;
    const status = document.getElementById('metronomeStatus');
    // Leemos el BPM del input que tienes en el HTML
    const bpmInput = document.getElementById('bpmInput');
    const currentBpm = bpmInput ? bpmInput.value : 100;
    const intervalMs = 60000 / currentBpm;

    status.innerText = "Preparando... 4";
    
    const interval = setInterval(() => {
        counts++;
        status.innerText = `Preparando... ${4 - counts}`;
        
        // Llamamos a la función de sonido de click
        playClickSound(counts === 4 ? 880 : 440); 
        
        if (counts === 4) {
            clearInterval(interval);
            status.innerText = "¡GRABANDO!";
            callback();
        }
    }, intervalMs);
}

// --- Sonido del click para la cuenta atrás ---
function playClickSound(freq) {
    // Usamos el audioCtx global que ya creaste en el HTML
    if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

// Controles manuales
function playLoop() { if (loopAudio) loopAudio.play(); }
function stopLoop() { if (loopAudio) { loopAudio.pause(); loopAudio.currentTime = 0; } }
function clearLoop() { stopLoop(); loopAudio = null; document.getElementById('btnPlay').disabled = true; }