let mediaRecorder;
let audioChunks = [];
let loopAudio = null;
let isRecording = false;
let startTime;
let timerInterval;
let progressInterval;

// --- Función de cuenta atrás ---
window.startMetronome = function(callback) {
    let counts = 0;
    const status = document.getElementById('metronomeStatus');
    const bpmInput = document.getElementById('bpmInput');
    const currentBpm = bpmInput ? bpmInput.value : 100;
    const intervalMs = 60000 / currentBpm;
    const dots = document.querySelectorAll('.dot');

    status.innerText = "Preparando... 4";
    
    const flashDot = (index) => {
        const dotIdx = index % 4;
        if (dots[dotIdx]) {
            dots.forEach(d => d.style.background = '#444');
            dots[dotIdx].style.background = 'var(--note-root)';
            setTimeout(() => {
                dots[dotIdx].style.background = '#444';
            }, 150);
        }
    };

    // PRIMER GOLPE (El 4)
    flashDot(0);
    window.playClickSound(440);

    const interval = setInterval(() => {
        counts++;
        
        if (counts < 4) {
            status.innerText = `Preparando... ${4 - counts}`;
            flashDot(counts);
            window.playClickSound(counts === 3 ? 880 : 440);
        } else {
            clearInterval(interval);
            status.innerText = "¡GRABANDO!";
            // IMPORTANTE: Limpiamos los puntos antes de pasar el testigo al metrónomo real
            dots.forEach(d => d.style.background = '#444');
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

// ... (resto de funciones formatTime, stopRecording, clearLoop, playClickSound, saveAndPlayLoop, etc. se mantienen igual)
