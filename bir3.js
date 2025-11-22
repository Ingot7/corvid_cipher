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

        this.cipherSequence = [];
        this.isPlaying = false;
        this.currentAudio = null;
        this.audioContext = null;
        this.audioBuffers = {}; // Cache for loaded sounds

        this.init();
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
    }

    translate() {
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
        // Preload sounds
        this.preloadSounds();
    }

    async preloadSounds() {
        const uniqueIds = [...new Set(this.cipherSequence.filter(item => item).map(item => item.id))];

        for (let id of uniqueIds) {
            if (!this.audioBuffers[id]) {
                // Use HTML5 Audio instead of Web Audio API to avoid CORS issues with file://
                const audio = new Audio(`https://xeno-canto.org/${id}/download`);
                audio.preload = 'auto';
                this.audioBuffers[id] = audio;

                // Optional: Check if it loads
                audio.addEventListener('error', (e) => {
                    console.error(`Failed to load sound ${id}`, e);
                });
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
            if (!this.isPlaying) break;

            const item = this.cipherSequence[i];

            // Update progress
            const progress = ((i + 1) / this.cipherSequence.length) * 100;
            this.progressFill.style.width = `${progress}%`;

            if (item) {
                // Highlight visual
                if (visualElements[visualIndex]) {
                    visualElements[visualIndex].classList.add('active');
                    setTimeout(() => {
                        const el = document.querySelector('.cipher-char.active');
                        if (el) el.classList.remove('active');
                    }, 500);
                    visualIndex++;
                }

                // Play sound
                if (this.audioBuffers[item.id]) {
                    const audio = this.audioBuffers[item.id];
                    this.currentAudio = audio; // Track current audio to pause it if needed

                    audio.currentTime = 0;
                    try {
                        await audio.play();
                    } catch (e) {
                        console.error("Playback failed", e);
                    }

                    // Wait for a duration
                    await this.wait(800);
                } else {
                    await this.wait(500);
                }
            } else {
                // Space/Pause
                await this.wait(400);
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
        const active = document.querySelector('.cipher-char.active');
        if (active) active.classList.remove('active');
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
