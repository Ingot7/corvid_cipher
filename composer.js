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

// Keyboard Mappings
const KEY_MAP = {
    'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4, 'y': 5, 'u': 6, 'i': 7
};

// Pitch Scale (C Major-ish relative steps)
const NOTE_MAP = {
    'a': 1.0,       // C
    's': 1.122,     // D
    'd': 1.26,      // E
    'f': 1.335,     // F
    'g': 1.498,     // G
    'h': 1.682,     // A
    'j': 1.888,     // B
    'k': 2.0        // C (Octave)
};

class CorvidComposer {
    constructor() {
        this.grid = document.getElementById('sequencerGrid');
        this.playBtn = document.getElementById('playBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.bpmInput = document.getElementById('bpmInput');
        this.presetSelect = document.getElementById('presetSelect');
        this.statusText = document.getElementById('statusText');

        // New UI Elements
        this.drumPlayBtn = document.getElementById('drumPlayBtn');
        this.drumVolumeSlider = document.getElementById('drumVolume');
        this.keysContainer = document.getElementById('keysContainer');

        this.steps = 16;
        this.bpm = 120;
        this.isPlaying = false;
        this.currentStep = 0;
        this.intervalId = null;
        this.audioBuffers = {}; // Cache
        this.activeSources = []; // Track playing audio nodes

        // Drum Machine State
        this.isDrumsPlaying = false;
        this.drumIntervalId = null;
        this.drumStep = 0;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.drumVolume = 0.5;

        // State: 2D array [trackIndex][stepIndex] = boolean
        this.pattern = Array(SOUND_BANK.length).fill().map(() => Array(this.steps).fill(false));

        this.init();
    }

    init() {
        this.renderGrid();
        this.initKeyboard();
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
            if (this.isDrumsPlaying) {
                this.stopDrums();
                this.playDrums();
            }
        });
        this.presetSelect.addEventListener('change', (e) => this.loadPreset(e.target.value));

        // Drum Controls
        this.drumPlayBtn.addEventListener('click', () => {
            if (this.isDrumsPlaying) this.stopDrums();
            else this.playDrums();
        });
        this.drumVolumeSlider.addEventListener('input', (e) => {
            this.drumVolume = parseFloat(e.target.value);
        });

        // Keyboard Events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    initKeyboard() {
        this.keysContainer.innerHTML = '';

        // Row 1: Sound Triggers
        Object.keys(KEY_MAP).forEach(key => {
            const trackIdx = KEY_MAP[key];
            if (trackIdx < SOUND_BANK.length) {
                this.createKey(key, SOUND_BANK[trackIdx].name);
            }
        });

        // Row 2: Pitch Triggers (using Raven as default instrument)
        Object.keys(NOTE_MAP).forEach(key => {
            this.createKey(key, `Pitch x${NOTE_MAP[key].toFixed(1)}`);
        });
    }

    createKey(char, label) {
        const keyEl = document.createElement('div');
        keyEl.className = 'key';
        keyEl.dataset.key = char;
        keyEl.innerHTML = `
            <span class="key-char">${char.toUpperCase()}</span>
            <span class="key-label">${label}</span>
        `;
        keyEl.addEventListener('mousedown', () => this.triggerKey(char));
        this.keysContainer.appendChild(keyEl);
    }

    handleKeyDown(e) {
        if (e.repeat) return;
        const key = e.key.toLowerCase();
        this.triggerKey(key);
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        const el = document.querySelector(`.key[data-key="${key}"]`);
        if (el) el.classList.remove('active');
    }

    triggerKey(key) {
        const el = document.querySelector(`.key[data-key="${key}"]`);
        if (el) {
            el.classList.add('active');
            setTimeout(() => el.classList.remove('active'), 200); // Visual fallback
        }

        if (KEY_MAP.hasOwnProperty(key)) {
            // Play specific sound
            const trackIdx = KEY_MAP[key];
            if (trackIdx < SOUND_BANK.length) {
                this.playSound(SOUND_BANK[trackIdx].id);
            }
        } else if (NOTE_MAP.hasOwnProperty(key)) {
            // Play pitched sound (using Raven Call as default melodic voice)
            // ID: 1027362 (Raven Call)
            this.playSound('1027362', NOTE_MAP[key]);
        }
    }

    renderGrid() {
        this.grid.innerHTML = '';
        this.grid.style.gridTemplateColumns = `150px repeat(${this.steps}, 1fr)`;

        SOUND_BANK.forEach((sound, trackIndex) => {
            const label = document.createElement('div');
            label.className = 'track-label';
            label.textContent = sound.name;
            this.grid.appendChild(label);

            for (let i = 0; i < this.steps; i++) {
                const btn = document.createElement('div');
                btn.className = 'step-btn';
                btn.dataset.track = trackIndex;
                btn.dataset.step = i;
                if (i % 4 === 0) btn.style.borderLeft = '1px solid rgba(255,255,255,0.3)';
                btn.addEventListener('click', () => this.toggleStep(trackIndex, i, btn));
                this.grid.appendChild(btn);
            }
        });
    }

    toggleStep(track, step, element) {
        this.pattern[track][step] = !this.pattern[track][step];
        element.classList.toggle('active');
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
                    this.statusText.textContent = "Interactive Ready.";
                }
            });
            this.audioBuffers[sound.id] = audio;
        });
    }

    playSound(id, rate = 1.0) {
        const buffer = this.audioBuffers[id];
        if (buffer) {
            // Clone node to allow overlapping sounds
            const clone = buffer.cloneNode();
            clone.playbackRate = rate;

            // Track active source
            this.activeSources.push(clone);

            // Remove from tracking when done
            clone.addEventListener('ended', () => {
                const index = this.activeSources.indexOf(clone);
                if (index > -1) {
                    this.activeSources.splice(index, 1);
                }
            });

            clone.play().catch(e => console.error("Play error", e));
        }
    }

    // --- Sequencer Logic ---

    play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.currentStep = 0;
        const interval = (60 / this.bpm) * 1000 / 4;
        this.playStep();
        this.intervalId = setInterval(() => {
            this.currentStep = (this.currentStep + 1) % this.steps;
            this.playStep();
        }, interval);
        this.statusText.textContent = "Playing Sequence...";
    }

    playStep() {
        const allSteps = document.querySelectorAll('.step-btn');
        allSteps.forEach(el => el.classList.remove('playing'));

        SOUND_BANK.forEach((_, trackIndex) => {
            const stepEl = document.querySelector(`.step-btn[data-track="${trackIndex}"][data-step="${this.currentStep}"]`);
            if (stepEl) stepEl.classList.add('playing');
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

        // Drums are now independent - do not stop them here
        // if (this.isDrumsPlaying) {
        //     this.stopDrums();
        // }

        // Stop all active bird sounds (clones)
        this.activeSources.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        this.activeSources = []; // Clear the list
    }

    clearPattern() {
        this.pattern = this.pattern.map(row => row.fill(false));
        document.querySelectorAll('.step-btn').forEach(el => el.classList.remove('active'));
        this.stop();
    }

    loadPreset(type) {
        this.clearPattern();
        if (!type) return;
        if (type === 'basic') {
            this.setStep(1, 0); this.setStep(1, 4); this.setStep(1, 8); this.setStep(1, 12);
            this.setStep(6, 4); this.setStep(6, 12);
            for (let i = 0; i < 16; i += 2) this.setStep(5, i);
        } else if (type === 'syncopated') {
            this.setStep(1, 0); this.setStep(1, 3); this.setStep(1, 8); this.setStep(1, 11);
            this.setStep(6, 4); this.setStep(6, 12);
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

    // --- Drum Machine Logic (Web Audio API) ---

    playDrums() {
        if (this.isDrumsPlaying) return;
        this.isDrumsPlaying = true;
        this.drumPlayBtn.textContent = "Stop Drums";
        this.drumPlayBtn.style.background = "var(--accent-color)";
        this.drumPlayBtn.style.color = "var(--bg-color)";

        // Resume context if suspended (browser policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.drumStep = 0;
        const interval = (60 / this.bpm) * 1000 / 4;

        this.playDrumStep();
        this.drumIntervalId = setInterval(() => {
            this.drumStep = (this.drumStep + 1) % 16;
            this.playDrumStep();
        }, interval);
    }

    stopDrums() {
        this.isDrumsPlaying = false;
        clearInterval(this.drumIntervalId);
        this.drumPlayBtn.textContent = "Start Drums";
        this.drumPlayBtn.style.background = "";
        this.drumPlayBtn.style.color = "";
    }

    playDrumStep() {
        const time = this.audioContext.currentTime;

        // Basic Rock Beat
        // Kick: 0, 4, 8, 12 (and syncopation on 10)
        if (this.drumStep % 4 === 0 || this.drumStep === 10) {
            this.triggerDrum('kick', time);
        }

        // Snare: 4, 12
        if (this.drumStep === 4 || this.drumStep === 12) {
            this.triggerDrum('snare', time);
        }

        // Hi-hat: Every 2 steps (8th notes)
        if (this.drumStep % 2 === 0) {
            this.triggerDrum('hihat', time);
        }
    }

    triggerDrum(type, time) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        const vol = this.drumVolume;

        if (type === 'kick') {
            osc.frequency.setValueAtTime(150, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
            gain.gain.setValueAtTime(vol, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
            osc.start(time);
            osc.stop(time + 0.5);
        } else if (type === 'snare') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, time);
            gain.gain.setValueAtTime(vol * 0.8, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            osc.start(time);
            osc.stop(time + 0.2);

            // Add noise for snare snap
            this.createNoise(time, 0.2, vol * 0.5);
        } else if (type === 'hihat') {
            // High frequency noise/tone
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, time);
            // Very short decay
            gain.gain.setValueAtTime(vol * 0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
            osc.start(time);
            osc.stop(time + 0.05);
        }
    }

    createNoise(time, duration, vol) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        noise.connect(gain);
        gain.connect(this.audioContext.destination);
        noise.start(time);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CorvidComposer();
});
