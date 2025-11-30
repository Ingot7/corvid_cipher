/**
 * Corvid Composer
 * Sequencer logic for creating music with bird sounds.
 */

// Sound Bank - Subset of Cipher Map
const SOUND_BANK = [
    // Bass / Low (Raven, Rook)
    { id: '1027362', name: 'Raven Call (Bass)', type: 'bass' },
    { id: '1019144', name: 'Raven Alarm (Kick)', type: 'bass' },
    { id: '960647', name: 'Rook Call (Low)', type: 'bass' },

    // Mids (Crow)
    { id: '943486', name: 'Crow Call', type: 'mid' },
    { id: '909938', name: 'Crow Begging', type: 'mid' },

    // Treble / High (Jackdaw, Magpie, Jay)
    { id: '1025925', name: 'Jackdaw (Hi-Hat)', type: 'treble' },
    { id: '1023191', name: 'Magpie (Snare)', type: 'treble' },
    { id: '1056303', name: 'Jay Call (Perc)', type: 'treble' }
];

class CorvidComposer {
    constructor() {
        this.grid = document.getElementById('sequencerGrid');
        this.playBtn = document.getElementById('playBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.bpmInput = document.getElementById('bpmInput');
        this.presetSelect = document.getElementById('presetSelect');
        this.statusText = document.getElementById('statusText');

        this.steps = 16;
        this.bpm = 120;
        this.isPlaying = false;
        this.currentStep = 0;
        this.intervalId = null;
        this.audioBuffers = {}; // Cache

        // State: 2D array [trackIndex][stepIndex] = boolean
        this.pattern = Array(SOUND_BANK.length).fill().map(() => Array(this.steps).fill(false));

        this.init();
    }

    init() {
        this.renderGrid();
        this.setupEventListeners();
        this.preloadSounds();
    }

    setupEventListeners() {
        this.playBtn.addEventListener('click', () => this.play());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.clearBtn.addEventListener('click', () => this.clearPattern());
        this.bpmInput.addEventListener('change', (e) => {
            this.bpm = parseInt(e.target.value) || 120;
            if (this.isPlaying) {
                this.stop();
                this.play(); // Restart with new BPM
            }
        });
        this.presetSelect.addEventListener('change', (e) => this.loadPreset(e.target.value));
    }

    renderGrid() {
        this.grid.innerHTML = '';

        // CSS Grid Layout needs to be defined dynamically if we want labels + steps
        this.grid.style.gridTemplateColumns = `150px repeat(${this.steps}, 1fr)`;

        SOUND_BANK.forEach((sound, trackIndex) => {
            // Label
            const label = document.createElement('div');
            label.className = 'track-label';
            label.textContent = sound.name;
            this.grid.appendChild(label);

            // Steps
            for (let i = 0; i < this.steps; i++) {
                const btn = document.createElement('div');
                btn.className = 'step-btn';
                btn.dataset.track = trackIndex;
                btn.dataset.step = i;

                // Beat markers styling (every 4th beat)
                if (i % 4 === 0) btn.style.borderLeft = '1px solid rgba(255,255,255,0.3)';

                btn.addEventListener('click', () => this.toggleStep(trackIndex, i, btn));
                this.grid.appendChild(btn);
            }
        });
    }

    toggleStep(track, step, element) {
        this.pattern[track][step] = !this.pattern[track][step];
        element.classList.toggle('active');

        // Preview sound if turning on
        if (this.pattern[track][step]) {
            this.playSound(SOUND_BANK[track].id);
        }
    }

    preloadSounds() {
        this.statusText.textContent = "Loading sounds...";
        let loaded = 0;
        SOUND_BANK.forEach(sound => {
            const audio = new Audio(`https://xeno-canto.org/${sound.id}/download`);
            audio.preload = 'auto';
            audio.addEventListener('canplaythrough', () => {
                loaded++;
                if (loaded === SOUND_BANK.length) {
                    this.statusText.textContent = "Ready to compose.";
                }
            });
            this.audioBuffers[sound.id] = audio;
        });
    }

    playSound(id) {
        const audio = this.audioBuffers[id];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Play error", e));
        }
    }

    play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.currentStep = 0;

        const interval = (60 / this.bpm) * 1000 / 4; // 16th notes

        this.playStep(); // Play first immediately
        this.intervalId = setInterval(() => {
            this.currentStep = (this.currentStep + 1) % this.steps;
            this.playStep();
        }, interval);

        this.statusText.textContent = "Playing...";
    }

    playStep() {
        // Visual feedback
        const allSteps = document.querySelectorAll('.step-btn');
        allSteps.forEach(el => el.classList.remove('playing'));

        // Highlight current column
        SOUND_BANK.forEach((_, trackIndex) => {
            // Calculate index in the flat grid list (Label + 16 steps per row)
            // Grid child index is 1-based. 
            // Row starts at: trackIndex * (17) 
            // Step is at: + 1 (label) + stepIndex + 1
            // Easier to select by dataset
            const stepEl = document.querySelector(`.step-btn[data-track="${trackIndex}"][data-step="${this.currentStep}"]`);
            if (stepEl) stepEl.classList.add('playing');

            // Play sound if active
            if (this.pattern[trackIndex][this.currentStep]) {
                this.playSound(SOUND_BANK[trackIndex].id);
            }
        });
    }

    stop() {
        this.isPlaying = false;
        clearInterval(this.intervalId);
        this.currentStep = 0;
        document.querySelectorAll('.step-btn').forEach(el => el.classList.remove('playing'));
        this.statusText.textContent = "Stopped.";
    }

    clearPattern() {
        this.pattern = this.pattern.map(row => row.fill(false));
        document.querySelectorAll('.step-btn').forEach(el => el.classList.remove('active'));
        this.stop();
    }

    loadPreset(type) {
        this.clearPattern();
        if (!type) return;

        // Simple presets
        if (type === 'basic') {
            // Kick (Raven Alarm) on 0, 4, 8, 12
            this.setStep(1, 0); this.setStep(1, 4); this.setStep(1, 8); this.setStep(1, 12);
            // Snare (Magpie) on 4, 12
            this.setStep(6, 4); this.setStep(6, 12);
            // Hi-Hat (Jackdaw) every 2
            for (let i = 0; i < 16; i += 2) this.setStep(5, i);
        } else if (type === 'syncopated') {
            // Kick
            this.setStep(1, 0); this.setStep(1, 3); this.setStep(1, 8); this.setStep(1, 11);
            // Snare
            this.setStep(6, 4); this.setStep(6, 12);
            // Crow
            this.setStep(3, 14);
        } else if (type === 'chaos') {
            for (let i = 0; i < 10; i++) {
                const t = Math.floor(Math.random() * SOUND_BANK.length);
                const s = Math.floor(Math.random() * 16);
                this.setStep(t, s);
            }
        }
    }

    setStep(track, step) {
        if (track < SOUND_BANK.length && step < this.steps) {
            this.pattern[track][step] = true;
            const el = document.querySelector(`.step-btn[data-track="${track}"][data-step="${step}"]`);
            if (el) el.classList.add('active');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CorvidComposer();
});
