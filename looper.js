let mediaRecorder;
let audioChunks = [];
let loopAudio = null; // Aquí guardaremos el objeto Audio resultante
let isRecording = false;
let metronomeInterval;

// ESTO ES VITAL: Necesitamos que tus funciones playPiano/playGuitar 
// envíen el audio a este "Destination" además de a los altavoces.
const loopDest = audioCtx.createMediaStreamDestination();

// --- Función para el Metrónomo de entrada ---
function startMetronome(callback) {
    let counts = 0;
    const status = document.getElementById('metronomeStatus');
    status.innerText = "Preparando... 4";
    
    const interval = setInterval(() => {
        counts++;
        status.innerText = `Preparando... ${4 - counts}`;
        // Sonido de click (puedes usar un oscilador simple aquí)
        playClickSound(counts === 4 ? 880 : 440); 
        
        if (counts === 4) {
            clearInterval(interval);
            status.innerText = "¡GRABANDO!";
            callback();
        }
    }, 1000); // 60 BPM para empezar, luego lo ajustamos
}

function playClickSound(freq) {
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

// --- Lógica de Grabación ---
function toggleRecord() {
    if (!isRecording) {
        startMetronome(() => {
            isRecording = true;
            audioChunks = [];
            document.getElementById('recDot').classList.add('active');
            
            mediaRecorder = new MediaRecorder(loopDest.stream);
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
    mediaRecorder.stop();
}

function saveLoop() {
    const blob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
    const url = URL.createObjectURL(blob);
    loopAudio = new Audio(url);
    loopAudio.loop = true; // ¡Aquí está la magia del loop!
    document.getElementById('btnPlay').disabled = false;
}

function playLoop() {
    if (loopAudio) loopAudio.play();
}

function stopLoop() {
    if (loopAudio) loopAudio.pause();
    loopAudio.currentTime = 0;
}

function clearLoop() {
    stopLoop();
    loopAudio = null;
    document.getElementById('btnPlay').disabled = true;
}
