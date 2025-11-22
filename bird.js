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
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const uniqueIds = [...new Set(this.cipherSequence.filter(item => item).map(item => item.id))];

        for (let id of uniqueIds) {
            if (!this.audioBuffers[id]) {
                try {
                    const response = await fetch(`https://xeno-canto.org/${id}/download`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    this.audioBuffers[id] = audioBuffer;
                } catch (e) {
                    console.error(`Failed to load sound ${id}`, e);
                    // Visual feedback for error
                    const errorMsg = document.createElement('div');
                    errorMsg.style.color = 'var(--error)';
                    errorMsg.style.fontSize = '0.8rem';
                    errorMsg.textContent = `Error loading audio. If opening from file://, browser security may block this.`;
                    this.outputSection.appendChild(errorMsg);
                }
            }
        }
    }

    async playSequence() {
        if (this.isPlaying || this.cipherSequence.length === 0) return;

        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.isPlaying = true;
        this.playBtn.classList.add('playing'); // Add visual state if needed

        const visualElements = this.visualizer.querySelectorAll('.cipher-char');
        let visualIndex = 0;

        for (let i = 0; i < this.cipherSequence.length; i++) {
            if (!this.isPlaying) break; // Allow stopping?

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
                    }, 500); // Highlight duration
                    visualIndex++;
                }

                // Play sound
                if (this.audioBuffers[item.id]) {
                    const source = this.audioContext.createBufferSource();
                    source.buffer = this.audioBuffers[item.id];
                    source.connect(this.audioContext.destination);
                    source.start();

                    // Wait for a bit before next sound (overlap slightly or sequential?)
                    // Let's do sequential with a fixed tempo or based on duration
                    // For a cipher, a steady rhythm is nice.
                    await new Promise(r => setTimeout(r, 800));
                } else {
                    await new Promise(r => setTimeout(r, 500));
                }
            } else {
                // Space/Pause
                await new Promise(r => setTimeout(r, 400));
            }
        }

        this.isPlaying = false;
        this.playBtn.classList.remove('playing');
        this.progressFill.style.width = '0%';
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
