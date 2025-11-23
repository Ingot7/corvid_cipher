/**
 * Corvid Cipher
 * Logic for translating text to bird calls and playing them back.
 */

const CIPHER_MAP = {
    // Vowels - Carrion Crow
    'A': { species: 'Carrion Crow', type: 'Call', id: '943486' },
    'E': { species: 'Carrion Crow', type: 'Call', id: '925201' },
    'I': { species: 'Carrion Crow', type: 'Call', id: '922803' },
    'O': { species: 'Carrion Crow', type: 'Begging', id: '909938' },
    'U': { species: 'Carrion Crow', type: 'Call', id: '881570' },

    // Consonants - Raven
    'B': { species: 'Northern Raven', type: 'Call', id: '1027362' },
    'C': { species: 'Northern Raven', type: 'Call', id: '1026798' },
    'D': { species: 'Northern Raven', type: 'Alarm', id: '1019144' },
    'F': { species: 'Northern Raven', type: 'Call', id: '1011504' },
    'G': { species: 'Northern Raven', type: 'Call', id: '1007182' },

    // Consonants - Jackdaw
    'H': { species: 'Western Jackdaw', type: 'Call', id: '1025925' },
    'J': { species: 'Western Jackdaw', type: 'Call', id: '1025920' },
    'K': { species: 'Western Jackdaw', type: 'Call', id: '1024252' },
    'L': { species: 'Western Jackdaw', type: 'Call', id: '1024251' },

    // Consonants - Magpie
    'M': { species: 'Eurasian Magpie', type: 'Call', id: '1025967' },
    'N': { species: 'Eurasian Magpie', type: 'Call', id: '1023192' },
    'P': { species: 'Eurasian Magpie', type: 'Call', id: '1017982' },
    'Q': { species: 'Eurasian Magpie', type: 'Call', id: '1017981' },

    // Consonants - Jay
    'R': { species: 'Eurasian Jay', type: 'Call', id: '1056303' },
    'S': { species: 'Eurasian Jay', type: 'Call', id: '1056301' },
    'T': { species: 'Eurasian Jay', type: 'Call', id: '1056300' },
    'V': { species: 'Eurasian Jay', type: 'Call', id: '1054348' },

    // Consonants - Rook
    'W': { species: 'Rook', type: 'Call', id: '960647' },
    'X': { species: 'Rook', type: 'Call', id: '944398' },
    'Y': { species: 'Rook', type: 'Call', id: '911573' },
    'Z': { species: 'Rook', type: 'Call', id: '872926' }
};

class CorvidCipher {
    constructor() {
        this.input = document.getElementById('cipherInput');
        this.translateBtn = document.getElementById('translateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.outputSection = document.getElementById('outputSection');
        this.visualizer = document.getElementById('visualizer');
        this.playBtn = document.getElementById('playBtn');
        this.progressFill = document.getElementById('progressFill');
        this.toggleLegendBtn = document.getElementById('toggleLegendBtn');
        this.legendGrid = document.getElementById('legendGrid');
        this.canvas = document.getElementById('waveformCanvas');
        this.canvasCtx = this.canvas.getContext('2d');
        this.animationId = null;

        this.cipherSequence = [];
        this.isPlaying = false;
        this.currentAudio = null;
        this.audioBuffers = {}; // Cache for loaded sounds

        // Resize canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.init();
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    init() {
        this.translateBtn.addEventListener('click', () => this.translate());
        this.clearBtn.addEventListener('click', () => this.clear());
        this.playBtn.addEventListener('click', () => this.playSequence());
        this.toggleLegendBtn.addEventListener('click', () => {
            this.legendGrid.classList.toggle('hidden');
            this.toggleLegendBtn.textContent = this.legendGrid.classList.contains('hidden')
                ? 'Show Cipher Key'
                : 'Hide Cipher Key';
        });

        this.generateLegend();
        this.drawWaveform(); // Start the animation loop
    }

    // Simulated Waveform Visualizer
    drawWaveform() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.canvasCtx;

        ctx.clearRect(0, 0, width, height);

        if (this.isPlaying) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(143, 179, 149, 0.5)'; // Accent color
            ctx.lineWidth = 2;

            const time = Date.now() * 0.005;

            for (let x = 0; x < width; x++) {
                // Create a complex wave by combining multiple sine waves
                // Amplitude is higher in the middle
                const scale = 1 - Math.pow((x / width) * 2 - 1, 2);

                const y = height / 2 +
                    Math.sin(x * 0.02 + time) * 20 * scale +
                    Math.sin(x * 0.05 - time * 1.5) * 10 * scale;

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        } else {
            // Flat line when not playing
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();
        }

        this.animationId = requestAnimationFrame(() => this.drawWaveform());
    }

    async translate() {
        const text = this.input.value.toUpperCase();
        if (!text.trim()) return;

        this.cipherSequence = [];
        this.visualizer.innerHTML = '';

        for (let char of text) {
            if (CIPHER_MAP[char]) {
                const data = CIPHER_MAP[char];
                this.cipherSequence.push({ char, ...data });

                const el = document.createElement('div');
                el.className = 'cipher-char';
                el.textContent = char;
                el.title = `${data.species} (${data.type})`;
                el.dataset.char = char;
                this.visualizer.appendChild(el);
            } else if (char === ' ') {
                // Add a spacer for spaces
                const el = document.createElement('div');
                el.style.width = '20px';
                this.visualizer.appendChild(el);
                this.cipherSequence.push(null); // Pause
            }
        }

        this.outputSection.classList.add('active');

        // Show loading message
        this.playBtn.disabled = true;
        this.playBtn.style.opacity = '0.5';

        // Preload sounds and wait for completion
        await this.preloadSounds();

        // Re-enable play button
        this.playBtn.disabled = false;
        this.playBtn.style.opacity = '1';
    }

    async preloadSounds() {
        const uniqueIds = [...new Set(this.cipherSequence.filter(item => item).map(item => item.id))];

        for (let id of uniqueIds) {
            if (!this.audioBuffers[id]) {
                try {
                    // Fetch audio as blob for better mobile compatibility
                    const response = await fetch(`https://xeno-canto.org/${id}/download`);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    this.audioBuffers[id] = blobUrl;
                } catch (e) {
                    console.error(`Failed to load sound ${id}`, e);
                }
            }
        }
    }

    async playSequence() {
        // Toggle logic
        if (this.isPlaying) {
            this.stopSequence();
            return;
        }

        if (this.cipherSequence.length === 0) return;

        this.isPlaying = true;
        this.updatePlayButton(true); // Show Stop icon

        const visualElements = this.visualizer.querySelectorAll('.cipher-char');
        let visualIndex = 0;

        for (let i = 0; i < this.cipherSequence.length; i++) {
            // CRITICAL: Check if stopped before starting next iteration
            if (!this.isPlaying) break;

            const item = this.cipherSequence[i];

            // Update progress
            const progress = ((i + 1) / this.cipherSequence.length) * 100;
            this.progressFill.style.width = `${progress}%`;

            if (item) {
                // Highlight visual
                if (visualElements[visualIndex]) {
                    // Remove active class from all others first to be safe
                    document.querySelectorAll('.cipher-char.active').forEach(el => el.classList.remove('active'));

                    visualElements[visualIndex].classList.add('active');
                    visualIndex++;
                }

                // Play sound
                if (this.audioBuffers[item.id]) {
                    // Use preloaded blob URL (better for mobile)
                    const audio = new Audio(this.audioBuffers[item.id]);
                    this.currentAudio = audio;

                    let played = false;
                    try {
                        await audio.play();
                        played = true;
                    } catch (e) {
                        console.error("Playback failed", e);
                    }

                    // Only wait for audio if it actually started playing
                    if (played) {
                        await this.waitForAudio(audio);
                    }

                    // Add a distinct silence gap between letters (800ms)
                    await this.wait(800);
                } else {
                    // Fallback if audio missing
                    await this.wait(500);
                }
            } else {
                // Space/Pause (longer gap)
                await this.wait(800);
            }
        }

        this.stopSequence();
    }

    stopSequence() {
        this.isPlaying = false;
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        this.updatePlayButton(false); // Show Play icon
        this.progressFill.style.width = '0%';

        // Clear active visuals
        document.querySelectorAll('.cipher-char.active').forEach(el => el.classList.remove('active'));
    }

    // Wait for specific audio to end or stop command
    waitForAudio(audio) {
        return new Promise(resolve => {
            let resolved = false;

            const cleanup = () => {
                if (resolved) return;
                resolved = true;
                audio.removeEventListener('ended', onEnded);
                audio.removeEventListener('error', onError);
            };

            const onEnded = () => {
                cleanup();
                resolve();
            };

            const onError = () => {
                console.warn("Audio error during playback, skipping");
                cleanup();
                resolve();
            };

            const checkStop = () => {
                if (resolved) return;
                if (!this.isPlaying) {
                    cleanup();
                    resolve();
                    return;
                }
                requestAnimationFrame(checkStop);
            };

            audio.addEventListener('ended', onEnded);
            audio.addEventListener('error', onError);

            // Safety timeout (6 seconds max per bird call)
            // This prevents long recordings from overlapping with the next letter
            setTimeout(() => {
                if (!resolved) {
                    console.warn("Audio timeout, forcing stop");
                    audio.pause();
                    audio.currentTime = 0;
                    cleanup();
                    resolve();
                }
            }, 6000);

            checkStop();
        });
    }
    wait(ms) {
        return new Promise(resolve => {
            const start = Date.now();
            const check = () => {
                if (!this.isPlaying) {
                    resolve();
                    return;
                }
                if (Date.now() - start >= ms) {
                    resolve();
                    return;
                }
                requestAnimationFrame(check);
            };
            check();
        });
    }

    updatePlayButton(isPlaying) {
        if (isPlaying) {
            this.playBtn.classList.add('playing');
            this.playBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clip-rule="evenodd" />
                </svg>
            `; // Stop icon (Square)
            this.playBtn.setAttribute('aria-label', 'Stop Cipher');
        } else {
            this.playBtn.classList.remove('playing');
            this.playBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
                </svg>
            `; // Play icon (Triangle)
            this.playBtn.setAttribute('aria-label', 'Play Cipher');
        }
    }

    clear() {
        this.input.value = '';
        this.outputSection.classList.remove('active');
        this.visualizer.innerHTML = '';
        this.cipherSequence = [];
        this.progressFill.style.width = '0%';
        this.isPlaying = false;
    }

    generateLegend() {
        this.legendGrid.innerHTML = '';
        for (let [char, data] of Object.entries(CIPHER_MAP)) {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <strong>${char}</strong>
                <div>
                    <span class="bird-name">${data.species}</span>
                </div>
            `;
            this.legendGrid.appendChild(item);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new CorvidCipher();
});
