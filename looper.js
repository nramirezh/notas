let mediaRecorder;
let audioChunks = [];
let loopAudio = null;
let isRecording = false;

// Definimos la variable pero NO la inicializamos hasta que haya un AudioContext activo
window.loopDest = null;

function ensureLoopDest() {
    if (!window.loopDest && audioCtx) {
        window.loopDest = audioCtx.createMediaStreamDestination();
    }
}

// --- Metrónomo de entrada sincronizado con el BPM de la web ---
function startMetronome(callback) {
    let counts = 0;
    const status = document.getElementById('metronomeStatus');
    // Leemos el BPM actual de tu input de la interfaz
    const currentBpm = document.getElementById('bpmInput').value || 100;
    const intervalMs = 60000 / currentBpm;

    status.innerText = "Preparando... 4";
    
    const interval = setInterval(() => {
        counts++;
        status.innerText = `Preparando... ${4 - counts}`;
        playClickSound(counts === 4 ? 880 : 440); 
        
        if (counts === 4) {
            clearInterval(interval);
            status.innerText = "¡GRABANDO!";
            callback();
        }
    }, intervalMs); // Ahora la cuenta atrás va al ritmo de tu BPM
}

function playClickSound(freq) {
    if (!audioCtx) return;
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

// --- Grabación ---
function toggleRecord() {
    // Nos aseguramos de tener el contexto y el destino creados
    if (!audioCtx) {
        alert("Primero toca una nota para activar el sistema de audio.");
        return;
    }
    ensureLoopDest();

    if (!isRecording) {
        startMetronome(() => {
            isRecording = true;
            audioChunks = [];
            document.getElementById('recDot').classList.add('active');
            
            // Usamos el stream del destino que creamos
            mediaRecorder = new MediaRecorder(window.loopDest.stream);
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = saveLoop;
            mediaRecorder.start();
        });
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

function saveLoop() {
    const blob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
    const url = URL.createObjectURL(blob);
    
    // Si ya había un loop sonando, lo limpiamos
    if (loopAudio) {
        loopAudio.pause();
        loopAudio = null;
    }

    loopAudio = new Audio(url);
    loopAudio.loop = true;
    document.getElementById('btnPlay').disabled = false;
}

function playLoop() {
    if (loopAudio) loopAudio.play();
}

function stopLoop() {
    if (loopAudio) {
        loopAudio.pause();
        loopAudio.currentTime = 0;
    }
}

function clearLoop() {
    stopLoop();
    loopAudio = null;
    document.getElementById('btnPlay').disabled = true;
    document.getElementById('metronomeStatus').innerText = "Loop borrado";
}