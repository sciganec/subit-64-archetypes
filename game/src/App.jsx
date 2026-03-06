import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer } from "react";

// ── GAME CONSTANTS ──
const MAX_HEAT = 777;
const MAX_RES = 250;
const MAX_AZOTH = 80;
const TOTAL_STAGES = 10;
const SAVE_KEY = "alch-v10";
const BIN_LEN = 6;

const WHO_MAP = { "00": "THEY", "01": "YOU", "10": "ME", "11": "WE" };
const WHERE_MAP = { "00": "NORTH", "01": "WEST", "10": "EAST", "11": "SOUTH" };
const WHEN_MAP = { "00": "WINTER", "01": "AUTUMN", "10": "SPRING", "11": "SUMMER" };
const WHO_HUE = { THEY: 270, YOU: 210, ME: 145, WE: 35 };
const WHERE_SAT = { NORTH: 36, WEST: 50, EAST: 64, SOUTH: 74 };
const WHEN_LIT = { WINTER: 32, AUTUMN: 42, SPRING: 52, SUMMER: 62 };
const WHO_LABEL = { THEY: "Вони", YOU: "Ти", ME: "Я", WE: "Ми" };

const NAMES = { "000000": "Zero", "000001": "Omen", "000010": "Herald", "000011": "Tribunal", "000100": "Specter", "000101": "Relic", "000110": "Wanderer", "000111": "Legend", "001000": "Harbinger", "001001": "Stranger", "001010": "Ghost", "001011": "Envoy", "001100": "Exile", "001101": "Shadow", "001110": "Arrival", "001111": "Multitude", "010000": "Hermit", "010001": "Beloved", "010010": "Guide", "010011": "Oracle", "010100": "Keeper", "010101": "Confessor", "010110": "Archivist", "010111": "Elder", "011000": "Seeker", "011001": "Witness", "011010": "Teacher", "011011": "Visionary", "011100": "Sentinel", "011101": "Mediator", "011110": "Liberator", "011111": "Sage", "100000": "Solitary", "100001": "Mourner", "100010": "Survivor", "100011": "Sovereign", "100100": "Penitent", "100101": "Drifter", "100110": "Awakened", "100111": "Alchemist", "101000": "Dormant", "101001": "Outcast", "101010": "Pioneer", "101011": "Catalyst", "101100": "Steadfast", "101101": "Recluse", "101110": "Transformer", "101111": "Fulfilled", "110000": "Covenant", "110001": "Elegy", "110010": "Assembly", "110011": "Fellowship", "110100": "Archive", "110101": "Tradition", "110110": "Migration", "110111": "Council", "111000": "Threshold", "111001": "Convergence", "111010": "Inception", "111011": "Alliance", "111100": "Vigil", "111101": "Harvest", "111110": "Uprising", "111111": "Conciliar" };
const KEYS = { "000000": "джерело, порожнеча", "000001": "передчуття", "000010": "початок, вість", "000011": "судження", "000100": "пам'ять, привид", "000101": "спадщина", "000110": "мандри", "000111": "міф", "001000": "наближення", "001001": "незнайомець", "001010": "зовнішній імпульс", "001011": "вісник", "001100": "вигнання", "001101": "темрява, тінь", "001110": "повернення", "001111": "маси", "010000": "самота", "010001": "мудрий порадник", "010010": "напрямок", "010011": "пророцтво", "010100": "захист", "010101": "мудрість, сповідь", "010110": "збереження", "010111": "досвід", "011000": "пошук", "011001": "свідчення", "011010": "наставництво", "011011": "сновидіння", "011100": "охорона", "011101": "посередництво", "011110": "звільнення", "011111": "просвітлення", "100000": "ізоляція", "100001": "скорбота", "100010": "стійкість", "100011": "авторитет", "100100": "каяття", "100101": "блукання", "100110": "пробудження", "100111": "трансформація", "101000": "потенціал", "101001": "відторгнення", "101010": "ініціатива", "101011": "активація", "101100": "витривалість", "101101": "відступ", "101110": "метаморфоза", "101111": "цілісність", "110000": "фундамент", "110001": "жалоба", "110010": "збір", "110011": "солідарність", "110100": "архів", "110101": "традиція", "110110": "exodus", "110111": "колективне", "111000": "перехід", "111001": "розв'язання", "111010": "заснування", "111011": "коаліція", "111100": "пильність", "111101": "кульмінація", "111110": "революція", "111111": "єдність, екстаз" };

function xorBin(a, b) { let r = ""; for (let i = 0; i < BIN_LEN; i++)r += (a[i] === b[i]) ? "0" : "1"; return r; }
function transmute(a, b, c) { return xorBin(xorBin(a, b), c); }
function ac(who, where, when) { return `hsl(${WHO_HUE[who]},${WHERE_SAT[where]}%,${WHEN_LIT[when]}%)`; }
const ALL = [];
for (const [wb, wn] of Object.entries(WHO_MAP)) for (const [rb, rn] of Object.entries(WHERE_MAP)) for (const [eb, en] of Object.entries(WHEN_MAP)) { const b = wb + rb + eb; ALL.push({ bin: b, who: wn, where: rn, when: en, name: NAMES[b], key: KEYS[b] }); }
const ARCH_MAP = new Map(ALL.map(a => [a.bin, a]));
const ga = bin => ARCH_MAP.get(bin) || ALL[0];

// ── AUDIO ──
let _ctx = null;
const getCtx = () => { if (!_ctx) try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } if (_ctx?.state === "suspended") _ctx.resume(); return _ctx; };
const tone = (f, t, d, v = .1, dl = 0) => { const c = getCtx(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = t; o.frequency.value = f; const s = c.currentTime + dl; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + .01); g.gain.exponentialRampToValueAtTime(.001, s + d); o.start(s); o.stop(s + d + .05); o.onended = () => { try { g.disconnect(); o.disconnect(); } catch (e) { } }; };
const noise = (dur, v = .15, dl = 0, fq = 800) => { const c = getCtx(); if (!c) return; const n = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), ch = n.getChannelData(0); for (let i = 0; i < ch.length; i++)ch[i] = Math.random() * 2 - 1; const src = c.createBufferSource(); src.buffer = n; const flt = c.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = fq; const g = c.createGain(); src.connect(flt); flt.connect(g); g.connect(c.destination); const t = c.currentTime + dl; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + dur); src.start(t); src.stop(t + dur + .05); src.onended = () => { try { g.disconnect(); flt.disconnect(); src.disconnect(); } catch (e) { }; }; };
const SFX = {
  click: () => { tone(600, "square", .04, .06); },
  add: () => { tone(440, "sine", .1, .12); tone(550, "sine", .09, .09, .06); },
  remove: () => { tone(320, "sine", .07, .09); },
  heat: () => { tone(200, "sawtooth", .06, .04); },
  transmute: () => { [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, "sine", .3, .11, i * .065)); },
  success: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, "sine", .35, .13, i * .08)); },
  fail: () => { noise(.12, .2, 0, 500); tone(180, "sawtooth", .35, .13, .08); },
  posInc: () => { [880, 1108, 1320].forEach((f, i) => tone(f, "sine", .18, .1, i * .09)); },
  negInc: () => { noise(.16, .22, 0, 350); tone(150, "sawtooth", .28, .1, .05); },
  recover: () => { tone(660, "sine", .12, .09); tone(880, "sine", .12, .09, .1); },
  resonance: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, "sine", .5, .12, i * .07)); },
  heatWarn: () => { tone(80, "sawtooth", .3, .06); },
  ready: () => { tone(880, "sine", .08, .08); tone(1108, "sine", .08, .07, .1); },
};

// ── MUSIC ──
const SEASON_PATTERNS = {
  WINTER: { melody: [220, 220, 247, 220, 196, 220, 247, 262], bass: [110, 110, 123, 110, 98, 110, 123, 131], rhythm: [0.8, 0.4, 0.8, 0.4, 0.8, 0.6, 0.6, 1.2], type: "sine", bassType: "triangle", vol: 0.09, bassVol: 0.05, color: "#7dcfff", label: "Зима" },
  SPRING: { melody: [330, 370, 415, 370, 330, 415, 494, 415], bass: [165, 185, 207, 185, 165, 207, 247, 207], rhythm: [0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.5], type: "sine", bassType: "sine", vol: 0.1, bassVol: 0.04, color: "#4ade80", label: "Весна" },
  SUMMER: { melody: [440, 494, 523, 587, 523, 494, 440, 392], bass: [220, 247, 262, 294, 262, 247, 220, 196], rhythm: [0.15, 0.15, 0.2, 0.15, 0.15, 0.2, 0.3, 0.5], type: "sawtooth", bassType: "triangle", vol: 0.07, bassVol: 0.06, color: "#e8d44d", label: "Літо" },
  AUTUMN: { melody: [294, 330, 349, 330, 294, 262, 294, 330], bass: [147, 165, 174, 165, 147, 131, 147, 165], rhythm: [0.6, 0.4, 0.6, 0.4, 0.6, 0.8, 0.6, 1.0], type: "triangle", bassType: "sine", vol: 0.09, bassVol: 0.05, color: "#f8b500", label: "Осінь" },
};
const STAGE_SEASON = ["WINTER", "SPRING", "SPRING", "SUMMER", "AUTUMN", "SUMMER", "WINTER", "AUTUMN", "AUTUMN", "WINTER"];

const Music = {
  _loop: null, _season: null, _heat: 60, _enabled: true, _masterGain: null, _volume: 0.55,
  _getMaster() { const ctx = getCtx(); if (!ctx) return null; if (!this._masterGain) { this._masterGain = ctx.createGain(); this._masterGain.gain.value = this._volume; this._masterGain.connect(ctx.destination); } return this._masterGain; },
  setVolume(v) { this._volume = Math.max(0, Math.min(1, v)); if (this._masterGain) this._masterGain.gain.setTargetAtTime(this._volume, getCtx()?.currentTime || 0, .05); },
  _playNote(freq, start, dur, type, vol, pitchShift = 1) {
    const ctx = getCtx(); const mg = this._getMaster(); if (!ctx || !mg) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 5.5; lfoG.gain.value = freq * 0.012; lfo.connect(lfoG); lfoG.connect(o.frequency); lfo.start(start); lfo.stop(start + dur + .05);
    lfo.onended = () => { try { lfoG.disconnect(); lfo.disconnect(); } catch (e) { } };
    o.type = type; o.frequency.setValueAtTime(freq * pitchShift, start);
    g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(vol, start + 0.03); g.gain.setValueAtTime(vol, start + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g); g.connect(mg); o.start(start); o.stop(start + dur + .05);
    o.onended = () => { try { g.disconnect(); o.disconnect(); } catch (e) { } };
  },
  setHeat(h) { this._heat = h; },
  playMotif(season, len = 0.4) { if (!this._enabled) return; const p = SEASON_PATTERNS[season]; if (!p) return; const ctx = getCtx(); if (!ctx) return; const now = ctx.currentTime; const tempo = 0.6 + (this._heat / MAX_HEAT) * 0.8; const pitchShift = 1 + (this._heat / MAX_HEAT) * 0.18; const noteLen = len / p.melody.length; p.melody.slice(0, 4).forEach((f, i) => { this._playNote(f, now + i * noteLen / tempo, noteLen * 0.85 / tempo, p.type, p.vol * 0.8, pitchShift); }); },
  playTheme(season, duration = 6) { if (!this._enabled) return; const p = SEASON_PATTERNS[season]; if (!p) return; const ctx = getCtx(); if (!ctx) return; const now = ctx.currentTime; const tempo = 0.6 + (this._heat / MAX_HEAT) * 0.8; const pitchShift = 1 + (this._heat / MAX_HEAT) * 0.15; let t = now; const totalBeats = p.rhythm.reduce((a, b) => a + b, 0); const beatScale = duration / (totalBeats / tempo); for (let rep = 0; rep < 2; rep++) { p.melody.forEach((f, i) => { const dur = p.rhythm[i] * beatScale / tempo; this._playNote(f, t, dur * 0.88, p.type, p.vol, pitchShift); this._playNote(p.bass[i], t, dur * 0.92, p.bassType, p.bassVol, pitchShift * 0.5); t += dur; }); } },
  startBackground(season) {
    this.stopBackground(); if (!season || !this._enabled) return; this._season = season; const p = SEASON_PATTERNS[season]; if (!p) return; const ctx = getCtx(); if (!ctx) return; const mg = this._getMaster(); if (!mg) return;
    const playDrone = () => { if (this._season !== season) return; const now = ctx.currentTime; const ps = 1 + (this._heat / MAX_HEAT) * 0.12; const f = p.bass[0]; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(f * ps, now); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.04, now + 1.5); g.gain.setValueAtTime(0.04, now + 4); g.gain.linearRampToValueAtTime(0, now + 6); o.connect(g); g.connect(mg); o.start(now); o.stop(now + 6.1); o.onended = () => { try { g.disconnect(); o.disconnect(); } catch (e) { }; }; };
    const playLoop = () => { if (this._season !== season) return; playDrone(); this.playMotif(season, 3.5); this._loop = setTimeout(playLoop, 7200); };
    this._loop = setTimeout(playLoop, 800);
  },
  stopBackground() { if (this._loop) { clearTimeout(this._loop); this._loop = null; } this._season = null; },
  setEnabled(v) { this._enabled = v; if (!v) this.stopBackground(); },
  playTransition(fromSeason, toSeason) { if (!this._enabled) return; const pF = SEASON_PATTERNS[fromSeason], pT = SEASON_PATTERNS[toSeason]; if (!pF || !pT) return; const ctx = getCtx(); if (!ctx) return; const now = ctx.currentTime;[pF.bass[0], pF.melody[0], pF.melody[2]].forEach((f, i) => { this._playNote(f, now + i * 0.08, 1.2, pF.type, 0.06 * (1 - i * 0.2)); });[pT.bass[0], pT.melody[0], pT.melody[2]].forEach((f, i) => { this._playNote(f, now + 0.9 + i * 0.1, 1.5, pT.type, 0.07 * (1 - i * 0.15)); }); },
};

// ── STAGE AMBIENT ──
const STAGE_AMBIENT = [
  { glow: "#6272a4", particle: "#3a4580", bg: "radial-gradient(ellipse at 50% 20%,#1a1630 0%,#04030a 60%)" },
  { glow: "#7dcfff", particle: "#4aafee", bg: "radial-gradient(ellipse at 50% 20%,#0d1f35 0%,#020810 60%)" },
  { glow: "#e8d44d", particle: "#c8a810", bg: "radial-gradient(ellipse at 50% 20%,#1e1800 0%,#080600 60%)" },
  { glow: "#f07070", particle: "#c03030", bg: "radial-gradient(ellipse at 50% 20%,#1e0808 0%,#080202 60%)" },
  { glow: "#c084fc", particle: "#9040d0", bg: "radial-gradient(ellipse at 50% 20%,#160820 0%,#060208 60%)" },
  { glow: "#4ade80", particle: "#20a040", bg: "radial-gradient(ellipse at 50% 20%,#041408 0%,#010602 60%)" },
  { glow: "#f8b500", particle: "#d09000", bg: "radial-gradient(ellipse at 50% 20%,#1e1200 0%,#080500 60%)" },
  { glow: "#e879f9", particle: "#c040e0", bg: "radial-gradient(ellipse at 50% 20%,#160020 0%,#060008 60%)" },
  { glow: "#a8d8ff", particle: "#60a8e0", bg: "radial-gradient(ellipse at 50% 20%,#040e20 0%,#010408 60%)" },
  { glow: "#fff0a0", particle: "#e0c040", bg: "radial-gradient(ellipse at 50% 20%,#1a1a10 0%,#060606 60%)" },
];

// ── STAGE DATA ──
const STAGES = [
  { id: 1, name: "Нігредо", sub: "Чорніння", sym: "☽", ac: "#6272a4", bg: "#09080f", desc: "Розкладання матерії. Смерть старого Я. В темряві народжується нове.", hint: "Три архетипи самотності та скорботи породжують Тінь.", masterHints: ["Шукай тих, хто несе біль самотності та провини...", "Solitary, Mourner та Penitent — архетипи чорної стадії.", "Три архетипи смерті старого Я: ізоляція, скорбота, каяття."], required: ["100000", "100001", "100100"], result: "001101", heatMin: 80, heatMax: 160, cost: { mercury: 8, sulfur: 0, salt: 4, azoth: 0 }, reward: { mercury: 15, sulfur: 5, salt: 5, azoth: 1 } },
  { id: 2, name: "Альбедо", sub: "Біління", sym: "☿", ac: "#7dcfff", bg: "#050c12", desc: "Очищення після смерті. Білосніжний попіл. Дистиляція чистої душі.", hint: "Самітник, Охоронець і Сповідник дають Коханого.", masterHints: ["Альбедо — це очищення. Шукай тих, хто відсторонений від світу...", "Пустельники та охоронці знають білий шлях.", "Hermit охороняє порожнечу. Keeper захищає. Confessor очищає."], required: ["010000", "010100", "010101"], result: "010001", heatMin: 160, heatMax: 260, cost: { mercury: 4, sulfur: 0, salt: 12, azoth: 0 }, reward: { mercury: 10, sulfur: 10, salt: 10, azoth: 2 } },
  { id: 3, name: "Цитринітас", sub: "Жовтіння", sym: "☀", ac: "#e8d44d", bg: "#0e0b00", desc: "Золотавий світанок свідомості. Сонце відкриває двері до пізнання.", hint: "Шукач, Свідок і Вчитель породжують Провидця.", masterHints: ["Жовтіння — це розум. Шукай тих, хто прагне знань...", "Ті хто шукає, свідчить і навчає — несуть золото.", "Seeker + Witness + Teacher: пошук, пам'ять, мудрість."], required: ["011000", "011001", "011010"], result: "011011", heatMin: 260, heatMax: 380, cost: { mercury: 8, sulfur: 14, salt: 4, azoth: 0 }, reward: { mercury: 10, sulfur: 20, salt: 10, azoth: 3 } },
  { id: 4, name: "Рубедо", sub: "Червоніння", sym: "♦", ac: "#f07070", bg: "#120404", desc: "З'єднання протилежностей. Кров і золото. Народження через вогонь.", hint: "Піонер + Сповідник + Концилій = Алхімік.", masterHints: ["Червоне — це союз вогню і духу...", "Pioneer несе початок. Confessor — мудрість. Conciliar — єдність.", "Три полюси стають одним: рух, знання, спільність."], required: ["101010", "010101", "111111"], result: "100111", heatMin: 360, heatMax: 490, cost: { mercury: 14, sulfur: 18, salt: 8, azoth: 1 }, reward: { mercury: 15, sulfur: 15, salt: 15, azoth: 4 } },
  { id: 5, name: "Coniunctio", sub: "Хімічне весілля", sym: "⚤", ac: "#c084fc", bg: "#0a0514", desc: "Містичний союз. Чоловіче і жіноче зливаються. Андрогін народжується.", hint: "Мудрець + Алхімік + Сповнений = Рада.", masterHints: ["Весілля вимагає трьох, що вже досягли висоти...", "Sage, Alchemist і Fulfilled — три вершини одного шляху.", "Мудрість + Трансформація + Цілісність = Колективна мудрість."], required: ["011111", "100111", "101111"], result: "110111", heatMin: 460, heatMax: 590, cost: { mercury: 18, sulfur: 18, salt: 18, azoth: 3 }, reward: { mercury: 20, sulfur: 20, salt: 20, azoth: 5 } },
  { id: 6, name: "Lapis", sub: "Філософський камінь", sym: "✦", ac: "#4ade80", bg: "#020d05", desc: "Великий підсумок. Камінь торкається металу — і той стає золотом.", hint: "Steadfast + Ghost + Beloved — класична формула каменю.", masterHints: ["Витривалість, що пройшла через тінь і знайшла любов...", "Steadfast несе стійкість. Ghost — невидимість. Beloved — зцілення.", "Три архетипи поєднують тіло, дух і серце."], required: ["101100", "001010", "010001"], result: "110111", heatMin: 570, heatMax: 720, cost: { mercury: 22, sulfur: 22, salt: 22, azoth: 8 }, reward: { mercury: 30, sulfur: 30, salt: 30, azoth: 10 } },
  { id: 7, name: "Апофеоз", sub: "Безсмертя", sym: "∞", ac: "#f8b500", bg: "#070500", desc: "Ти більше не людина. Ти — архетип. Твоє ім'я вписане в тканину всесвіту.", hint: "Zero + Council + Conciliar = Вічна єдність.", masterHints: ["Порожнеча містить все. Рада несе мудрість. Єдність — завершення.", "Zero — початок до початків. Council — мудрість всіх. Conciliar — єдність.", "Три полюси часу і простору зливаються в одне."], required: ["000000", "110111", "111111"], result: "111111", heatMin: 700, heatMax: MAX_HEAT, cost: { mercury: 28, sulfur: 28, salt: 28, azoth: 18 }, reward: { mercury: 0, sulfur: 0, salt: 0, azoth: 99 } },
  { id: 8, name: "Multiplicatio", sub: "Множення Каменю", sym: "✺", ac: "#e879f9", bg: "#0d0017", desc: "Камінь множиться. Одна крихта лапіс стає тисячею. Сила росте без меж.", hint: "Conciliar + Ghost + Steadfast = Witness.", masterHints: ["Multiplicatio потребує тих, хто вже досяг безсмертя...", "Conciliar несе єдність. Ghost — невловимість. Steadfast — витривалість.", "Єдність + Тінь + Стійкість = Свідок."], required: ["111111", "001010", "101100"], result: "011001", heatMin: 540, heatMax: 680, cost: { mercury: 26, sulfur: 26, salt: 26, azoth: 12 }, reward: { mercury: 35, sulfur: 35, salt: 35, azoth: 14 } },
  { id: 9, name: "Projectio", sub: "Проекція", sym: "◈", ac: "#a8d8ff", bg: "#020810", desc: "Камінь проектується на базову матерію. Кожне торкання — трансформація.", hint: "Alliance + Inception + Harvest = Vigil.", masterHints: ["Projectio — тріада союзу, заснування і кульмінації...", "Alliance + Inception + Harvest: коаліція, початок, жнива.", "Три часи: союз, початок, підсумок."], required: ["111011", "111010", "111101"], result: "111100", heatMin: 640, heatMax: 755, cost: { mercury: 30, sulfur: 30, salt: 30, azoth: 16 }, reward: { mercury: 40, sulfur: 40, salt: 40, azoth: 18 } },
  { id: 10, name: "Resurrectio", sub: "Воскресіння", sym: "☯", ac: "#fff0a0", bg: "#070707", desc: "Смерть сама помирає. Повернення до Нульової Точки. Велике Коло замикається.", hint: "Conciliar + Pioneer + Confessor = Zero — повернення до витоків.", masterHints: ["Воскресіння — не кінець, а повернення...", "Conciliar + Pioneer + Confessor: єдність, ініціатива, мудрість.", "Три сили повертають алхіміка до самого початку."], required: ["111111", "101010", "010101"], result: "000000", heatMin: MAX_HEAT - 17, heatMax: MAX_HEAT, cost: { mercury: 35, sulfur: 35, salt: 35, azoth: 24 }, reward: { mercury: 0, sulfur: 0, salt: 0, azoth: 99 } },
];

const POS_INC = [
  { icon: "👻", name: "Привид Гермеса", msg: "Гермес Трисмегіст передає таємне знання.", fx: { azoth: 2, purity: 8 }, effect: { type: "glow", col: "#c084fc" } },
  { icon: "✨", name: "Золоте сяйво", msg: "З реторти виривається золоте сяйво!", fx: { azoth: 3, purity: 12 }, effect: { type: "radiate", col: "#f0d060" } },
  { icon: "🌟", name: "Зоряна роса", msg: "Краплина небесної роси потрапляє до складу.", fx: { salt: 10, purity: 10 }, effect: { type: "glow", col: "#7dcfff" } },
  { icon: "🔮", name: "Знак Меркурія", msg: "Ртуть утворила знак планети. Вдача!", fx: { mercury: 15, purity: 5 }, effect: { type: "radiate", col: "#a0f0a0" } },
];
const NEG_INC = [
  { icon: "💥", name: "Вибух реторти", msg: "Реторта розлетілась! На стіні залишився чорний слід.", fx: { mercury: -18, purity: -12 }, scar: "На стелі — чорна пляма від вибуху.", effect: { type: "flash", col: "#ff4400" } },
  { icon: "🌡️", name: "Меркуріальна лихоманка", msg: "Ви вдихнули пари ртуті. Руки тремтять.", fx: { mercury: -15, sulfur: 4 }, scar: "На підлозі — срібляста калюжа ртуті.", effect: { type: "flash", col: "#c0c0ff" } },
  { icon: "🔥", name: "Сульфурний вибух", msg: "Сірка спалахнула! Обвуглені стіни.", fx: { sulfur: -20, purity: -15 }, scar: "Стіна обвуглена. Запах сірки.", effect: { type: "flash", col: "#ff8800" } },
  { icon: "🧂", name: "Соляна кристалізація", msg: "Всі поверхні вкрились кристалами солі.", fx: { salt: -18, purity: -8 }, scar: "Кристали солі на обладнанні.", effect: { type: "glow", col: "#e0e8ff" } },
  { icon: "🌀", name: "Вихор матерії", msg: "Архетипи вирвались з рук і розсіялись!", fx: { mercury: -8, sulfur: -8, salt: -8 }, scar: "Залишки архетипів на стінах.", effect: { type: "spin", col: "#8080ff" } },
  { icon: "🐍", name: "Меркуріальний змій", msg: "З реторти вирвався ртутний дух.", fx: { mercury: -10, purity: -5 }, scar: "На дзеркалі — відбиток долоні.", effect: { type: "glow", col: "#40c080" } },
  { icon: "❄️", name: "Криголом Зими", msg: "Раптовий холод кристалізував реагенти.", fx: { salt: -12, mercury: -8 }, scar: "Підвіконня покрите інеєм.", effect: { type: "glow", col: "#a0c8ff" } },
];

const ACH = {
  n1: { icon: "🌑", title: "Неофіт", desc: "Пройдено Нігредо", fn: g => g.stage > 1 },
  n2: { icon: "☿", title: "Адепт", desc: "Пройдено Альбедо", fn: g => g.stage > 2 },
  n3: { icon: "☀", title: "Осяяний", desc: "Пройдено Цитринітас", fn: g => g.stage > 3 },
  n4: { icon: "♦", title: "Магістр", desc: "Пройдено Рубедо", fn: g => g.stage > 4 },
  n5: { icon: "⚤", title: "Кон'юнктор", desc: "Хімічне весілля", fn: g => g.stage > 5 },
  n6: { icon: "✦", title: "Філософ", desc: "Lapis створено", fn: g => g.stage > 6 },
  n7: { icon: "∞", title: "Безсмертний", desc: "Magnum Opus", fn: g => g.stage > 7 },
  pure: { icon: "💎", title: "Чистота", desc: "Чистота 100%", fn: g => g.purity >= 100 },
  pyro: { icon: "🔥", title: "Піромант", desc: "Досягнуто 777°", fn: g => g.maxHeat >= MAX_HEAT },
  streak: { icon: "🍀", title: "Фортуна", desc: "5 успіхів поспіль", fn: g => g.streak >= 5 },
  scholar: { icon: "🔬", title: "Дослідник", desc: "20 архетипів", fn: g => (g.used instanceof Set ? g.used.size : (g.used?.length || 0)) >= 20 },
  n8: { icon: "✺", title: "Множитель", desc: "Multiplicatio", fn: g => g.stage > 8 },
  n9: { icon: "◈", title: "Проектор", desc: "Projectio", fn: g => g.stage > 9 },
  n10: { icon: "☯", title: "Воскреслий", desc: "Resurrectio — фінал", fn: g => g.stage > TOTAL_STAGES },
  resonator: { icon: "🎵", title: "Резонатор", desc: "Резонанс 3 рази", fn: g => (g.resonances || 0) >= 3 },
  flawless: { icon: "⚡", title: "Бездоганний", desc: "Без провалу до стадії 5", fn: g => g.failures === 0 && g.stage > 5 },
  // Academy achievements
  chronicler: { icon: "📖", title: "Хроніст", desc: "Переглянуто всі 9 оповідей", fn: g => (g.narrativesSeen || new Set()).size >= 9 || (Array.isArray(g.narrativesSeen) && g.narrativesSeen.length >= 9) },
  scribe: { icon: "✎", title: "Нотатник", desc: "Нотатки до 10 архетипів", fn: g => Object.keys(g.notes || {}).filter(k => (g.notes[k] || "").trim().length > 0).length >= 10 },
  librarian: { icon: "📚", title: "Бібліотекар", desc: "Відкрито всі 10 листів", fn: g => (g.lettersSeen || new Set()).size >= 10 || (Array.isArray(g.lettersSeen) && g.lettersSeen.length >= 10) },
  cartographer: { icon: "🗺", title: "Картограф", desc: "64 архетипи вивчено", fn: g => (g.used instanceof Set ? g.used.size : (g.used?.length || 0)) >= 64 },
};

const NARRATIVES = [
  { title: "Нігредо завершено", sub: "Народження з попелу", sym: "☿", text: "Нігредо завершено. Твоє старе Я лежить у попелі.\n\nАле дивись — із попелу проростає щось біле і ніжне. Душа, позбавлена тягаря минулого.\n\nАльбедо чекає. Час очистити те, що народилось.", quote: "«Щоб народитись знову, спочатку треба вмерти.»" },
  { title: "Альбедо завершено", sub: "Кристал душі", sym: "☀", text: "Душа чиста, як гірський кристал. Золотий промінь пронизує свідомість.\n\nЦитринітас відкриває третє oko пізнання.", quote: "«Очищений камінь відбиває всі кольори.»" },
  { title: "Цитринітас завершено", sub: "Золото розуму", sym: "♦", text: "Ти пізнав таємниці розуму. Але знання — це лише карта.\n\nСправжній алхімік має не тільки знати — він має діяти.\n\nРубедо вимагає крові і рішучості.", quote: "«Золото розуму плавиться, щоб стати залізом волі.»" },
  { title: "Рубедо завершено", sub: "Союз протилежностей", sym: "⚤", text: "Король і Королева вінчаються у вогні.\n\nConiunctio — найдавніша таємниця. Чоловіче і жіноче стали одним.", quote: "«Нічого не досконале, якщо не з'єднано з протилежним.»" },
  { title: "Coniunctio завершено", sub: "Народження Андрогіна", sym: "✦", text: "Андрогін народився з полум'я союзу.\n\nLapis чекає — камінь, що перетворює все.", quote: "«З союзу двох постає третє — що вище за обох.»" },
  { title: "Lapis створено", sub: "Камінь у руках", sym: "∞", text: "Філософський камінь сяє в твоїх долонях.\n\nАле є щось вище за безсмертя. Апофеоз чекає.", quote: "«Lapis — не кінець. Це ключ від інших дверей.»" },
  { title: "Апофеоз досягнуто", sub: "Межа перетнута", sym: "✺", text: "Ти переступив межу людського. Але є Другий Шлях.\n\nMultiplicatio — стародавні майстри казали: камінь може множитись безмежно.", quote: "«За безсмертям є ще безсмертя.»" },
  { title: "Multiplicatio завершено", sub: "Тисячократне множення", sym: "◈", text: "Один камінь став тисячею.\n\nТепер — Projectio. Торкнись світ своїм каменем.", quote: "«Найбільша алхімія — коли ти сам стаєш каталізатором.»" },
  { title: "Projectio завершено", sub: "Трансформація світу", sym: "☯", text: "Кожна пилинка, кожна краплина — золото.\n\nЗалишилась одна дія. Resurrectio — і Велике Коло замикається навіки.", quote: "«Той, хто змінив світ, мусить змінити і себе назад.»" },
];

const WISDOMS = ["«Не поспішай. Алхімія навчає терпінню.»", "«Кожна невдача — урок, а не поразка.»", "«Читай ключові слова архетипів, як манускрипт.»", "«Температура має значення. Надто холодно — реакція спить.»", "«Подивись на кольори. Споріднені кольори — споріднені душі.»"];

const CLUE_WHO = { ME: "суб'єкт, що дивиться всередину — ізоляція, самодостатність, внутрішній вогонь. Зелені тони", YOU: "звернений до Іншого — діалог, зцілення, взаємодія. Блакитні тони", WE: "несе колективну пам'ять — спільнота, угода, фундамент. Жовто-бурштинові тони", THEY: "спостерігач ззовні — невловимий, зовнішня сила, анонімна маса. Фіолетові тони" };
const CLUE_WHERE = { NORTH: "холод та порожнеча — бліді, ненасичені тони. Мінімальна, ефемерна сутність", SOUTH: "спека та пристрасть — насичені, яскраві тони. Максимальна інтенсивність", EAST: "схід сонця — середня насиченість. Початок і потенціал", WEST: "захід сонця — помірна насиченість. Завершення і мудрість" };
const CLUE_WHEN = { WINTER: "дрімає — темні, глибокі тони. Прихований потенціал, очікування", SPRING: "пробуджений — середня яскравість. Новий початок, надія", SUMMER: "у розквіті — найяскравіші тони. Сила, зеніт, кульмінація", AUTUMN: "мудрість прощання — помірна яскравість. Жнива, підсумки" };
const CLUE_NUM = ["Перший інгредієнт", "Другий інгредієнт", "Третій інгредієнт"];

const LETTERS = [
  { from: "Магістр Северин, 1612", seal: "☽", text: "Учню мій. Ти стоїш перед першими вратами. Нігредо — це не покарання, це очищення вогнем.\n\nВіднайди трьох із роду самотніх. Не тих, хто обрав відлюдництво, — а тих, кому воно було призначене долею. Їхній біль — твій матеріал.\n\nТемпература Нігредо — жар помірний, як жар лихоманки. Занадто сильний вогонь спалить душу дощенту.", clue: "Шукай архетипи з тіньового боку буття — МЕ, що несуть порожнечу" },
  { from: "Сестра Клара Відська, 1687", seal: "☿", text: "Дорогий наступнику. Якщо ти тримаєш цей лист — ти пережив Нігредо. Вітаю.\n\nАльбедо обдурило багатьох моїх учнів. Вони шукали яскравого і гучного, а треба — тихого і відстороненого. Три мовчуни.\n\nОдин охороняє. Один зізнається. Один іде пустелею. Разом вони дають того, кого всі прагнуть.", clue: "Альбедо потребує трьох з роду ТИ (YOU) — звернених назовні, але що зберігають внутрішній храм" },
  { from: "Братство Золотого Ранку, 1743", seal: "☀", text: "Записка знайдена після пожежі в бібліотеці.\n\nЦитринітас — єдина стадія, де розум цінується більше за інтуїцію.\n\nТри архетипи знання: один шукає, один свідчить, один навчає. Усі троє з роду ТИ (YOU). Усі троє зі Сходу. Весна.\n\nТемпература висока — знання гаряче.", clue: "Всі три архетипи розділяють спільний вимір — шукай резонанс у роді ТИ / СХІД / ВЕСНА" },
  { from: "Дон Алессандро Феррі, 1801", seal: "♦", text: "Мій дорогий ворог і друг.\n\nРубедо мало не вбило мене двічі. Перший раз — коли я намагався об'єднати подібне з подібним. Помилка.\n\nПіонер — МЕ, Сповідник — ТИ, Концилій — МИ. Три різні роди в одному тиглі.\n\nВогонь сильний. Не бійся температури.", clue: "Рубедо — єдина стадія, де потрібні архетипи трьох різних родів (МЕ + ТИ + МИ)" },
  { from: "Баронеса Емілія фон Зальц, 1834", seal: "⚤", text: "Невідомому, що прийде після мене.\n\nConiunctio — весілля архетипів. Треба трьох, що вже пізнали трансформацію.\n\nМудреця — що розуміє все. Алхіміка — що перетворив себе. Сповненого — що досяг цілісності. Всі з роду МЕ.\n\nЯ плакала, коли у мене вийшло.", clue: "Всі три архетипи — найбільш зрілі з роду МЕ (ME): Sage, Alchemist, Fulfilled" },
  { from: "Невідомий алхімік, рукопис без дати", seal: "✦", text: "[Сторінки обпалені.]\n\n...Lapis вимагає трьох, що знають і смерть, і любов, і невидимість...\n\n...Steadfast — витривалість тіла. Ghost — невидимість духу. Beloved — зцілення серця...\n\n...МЕ + ВОНИ + ТИ... три різні роди... три різних сезони...\n\n[далі нечитабельно]", clue: "Lapis — три різні роди, три різні сезони. Шукай через різноманіття, а не схожість" },
  { from: "Профессор Гаррієт Блейк, 1912", seal: "∞", text: "Щоденник, знайдений у пожарищі Лондонської лабораторії.\n\nАпофеоз — це не стан, це операція.\n\nZero — порожній. Council — повний. Conciliar — єдиний. Порожнеча + Повнота + Єдність.\n\nВогонь майже максимальний. Я тремтіла.", clue: "Апофеоз — три прояви МИ: порожнеча (Zero), повнота (Council), єдність (Conciliar)" },
  { from: "Алхімік Ху Лі, 1967", seal: "✺", text: "Нотатки для нащадків.\n\nMultiplicatio — стадія парадоксу. Щоб множити камінь, треба помістити досконале поряд із непомітним і стійким.\n\nConciliar (МИ) + Ghost (ВОНИ) + Steadfast (МЕ) = Witness.\n\nЛогіка XOR: де різниця — там сила.", clue: "Multiplicatio: три роди (МИ + ВОНИ + МЕ), три характери (єдність + тінь + стійкість)" },
  { from: "Знайдено в мережі, автор невідомий", seal: "◈", text: "пост з форуму r/alchemy_practice, 2019:\n\nок так я нарешті зробив Projectio після 47 спроб\n\nВсі три з роду МИ (WE/111). Alliance, Inception, Harvest — коаліція, заснування, кульмінація.\n\nтемпература 640-755. не вище бо інакше спалює\n\nудачі всім хто це читає", clue: "Projectio: всі три — рід МИ (WE), але різні сезони. Союз, Початок, Кульмінація" },
  { from: "Заповіт Магістра Северина, знайдений після смерті", seal: "☯", text: "Якщо хтось дійшов до Resurrectio — слухай уважно.\n\nЯ прожив 94 роки в пошуках цієї формули. Я так і не завершив Велике Діяння.\n\nТри архетипи Воскресіння — три, що вже були використані раніше: Conciliar, Pioneer, Confessor. Велике Коло замикається.\n\nЯ пишаюсь тобою, незнайомцю.", clue: "Resurrectio: три архетипи, що вже з'являлись у попередніх стадіях — Коло замикається" },
];

const ROSE_Q = [
  { num: 1, title: "Терпіння", text: "Його першою перемогою є подолання власного нижчого «я».", icon: "⚖" },
  { num: 2, title: "Доброта", text: "Він ввічливий із кожним і завжди готовий допомогти.", icon: "🌿" },
  { num: 3, title: "Без заздрості", text: "Задоволений своєю долею. Щиро бажає добра кожному.", icon: "💫" },
  { num: 4, title: "Без хвастощів", text: "Чекає вказівок Внутрішнього Вчителя, не проявляє сліпого рвіння.", icon: "🌙" },
  { num: 5, title: "Без марнославства", text: "Ні хвала, ні осуд не порушують його внутрішнього спокою.", icon: "🪞" },
  { num: 6, title: "Без суєти", text: "Зосереджується на сутності, а не на зовнішніх формах.", icon: "⚗" },
  { num: 7, title: "Без честолюбства", text: "Дбає більше про благо інших, ніж про власні інтереси.", icon: "🕊" },
  { num: 8, title: "Незворушність", text: "Гармонія його душі не порушується жодною бурею.", icon: "🏔" },
  { num: 9, title: "Без злих думок", text: "Прагне бачити добро й відкладає судження.", icon: "🔮" },
  { num: 10, title: "Справедливість", text: "Не виступає пихатим суддею. Підноситься над дріб'язковістю.", icon: "⚖" },
  { num: 11, title: "Прагнення істини", text: "Живе в світлі істини й шукає спільності з тими, хто її любить.", icon: "☀" },
  { num: 12, title: "Мовчання", text: "Сила зростає через тишу.", icon: "🌑" },
  { num: 13, title: "Непохитна Віра", text: "Довіряє вічному закону причин і наслідків.", icon: "⚡" },
  { num: 14, title: "Тверда надія", text: "Ґрунтується на знанні, що істина зростає й перетворює зло на добро.", icon: "🌅" },
  { num: 15, title: "М'якість серця", text: "Не ожорсточує серця в випробуваннях.", icon: "🌒" },
  { num: 16, title: "Братерство", text: "Усі, хто живе в істині, належать до духовного братства.", icon: "∞" },
];

const STAGE_RIDDLES = [
  [{ n: 1, riddle: "Не ожорсточився в самоті, хоч темрява оточує його звідусіль. Він — наодинці з власним єством, у найхолоднішому куті, де немає ані кольору, ані звуку. Час його — крига.", hint: "Хто? Внутрішній. Де? Порожнеча. Коли? Зима." }, { n: 2, riddle: "Він не накопичує образ — дозволяє плевелам рости поруч із пшеницею, чекаючи часу жнив. Живе там, де порожнеча — холодний простір без форми. Осіннє зів'яння — його природа.", hint: "Хто? Той самий рід, що перший. Де? Та сама порожнеча. Коли? Жнива." }, { n: 3, riddle: "Марнославство йому чуже — він несе тягар каяття без жодного натяку на гордість. Народжений там, де сонце повільно вмирає за обрієм. Зима сковала його душу мовчазним покаянням.", hint: "Хто? Той самий рід. Де? Захід, де сонце вмирає. Коли? Зима." }],
  [{ n: 1, riddle: "Він ввічливий із кожним, але обрав мовчання пустелі. Звернений назовні — пізнає себе через Іншого. Народжений там, де нема кольору. Зима — його відлюдництво.", hint: "Хто? Діалогічний, але відсторонений. Де? Холодна порожнеча. Коли? Зима." }, { n: 2, riddle: "Зосереджується на сутності, а не на зовнішніх формах. Охороняє — мовчки, без слав і нагород. Там, де сонце повільно меркне. Час — зимова сторожа.", hint: "Хто? Той самий діалогічний рід. Де? Захід. Коли? Зима." }, { n: 3, riddle: "Не хвалиться — чекає вказівок Внутрішнього Вчителя. Знає ціну визнання і зізнання. Там, де сонце вмирає щовечора. Осінь забарвила його мудрість.", hint: "Хто? Той самий рід. Де? Захід. Коли? Осінь." }],
  [{ n: 1, riddle: "Живе в світлі істини й шукає спільності з тими, хто її любить. Звернений до світу зі Сходу — де народжується сонце. Але зима ще тримає його у своїх обіймах, і пошук тривалий.", hint: "Хто? Діалогічний. Де? Схід, де сонце народжується. Коли? Зима." }, { n: 2, riddle: "Той, хто думає погано, бачить лише власну тінь — але він прагне бачити добро. Свідчить без упередження. Той самий рід і те саме місце. Осінь — час жнив і спогадів.", hint: "Хто? Той самий рід. Де? Схід. Коли? Осінь." }, { n: 3, riddle: "Завжди готовий допомогти й передати знання. Доброта його виражається у наставництві. Зі Сходу — де все починається. Весна — його пора оновлення й навчання.", hint: "Хто? Той самий рід. Де? Схід. Коли? Весна." }],
  [{ n: 1, riddle: "Не думає зла — кожен крок наперед є актом чистої ініціативи. Внутрішній, звернений до власної глибини. Зі Сходу. Весна клекотить у його жилах.", hint: "Хто? Внутрішній. Де? Схід. Коли? Весна." }, { n: 2, riddle: "Чекає вказівок Внутрішнього Вчителя, перш ніж говорити — і мудрість його у сповіді. Діалогічний. Там, де день згасає. Осінь несе каяття.", hint: "Хто? Діалогічний. Де? Захід. Коли? Осінь." }, { n: 3, riddle: "Усі, хто живе в істині — належать до його братства. Колективний, єдиний. Народжений там, де спека найбільша. Літо — його торжество.", hint: "Хто? Колективний. Де? Південь. Коли? Літо." }],
  [{ n: 1, riddle: "Чим більші його можливості — тим скромнішим він стає. Мудрість без марнославства. Діалогічний. Народжений на Сході. Літо.", hint: "Хто? Діалогічний. Де? Схід. Коли? Літо." }, { n: 2, riddle: "Дбає більше про благо інших — власна трансформація лише інструмент. Внутрішній. Народжений у спеці Півдня. Літо.", hint: "Хто? Внутрішній. Де? Південь. Коли? Літо." }, { n: 3, riddle: "Довіряє вічному закону причин і наслідків. Досяг цілісності. Внутрішній. Схід. Літо.", hint: "Хто? Внутрішній. Де? Схід. Коли? Літо." }],
  [{ n: 1, riddle: "Терпіння — його перша перемога. Витримує все. Внутрішній, зі Сходу. Зима — його загартування.", hint: "Хто? Внутрішній. Де? Схід. Коли? Зима." }, { n: 2, riddle: "Сила зростає через тишу і невидимість. Зовнішній — той, кого відчувають, але не бачать. Зі Сходу. Весна підживлює його невидимість.", hint: "Хто? Зовнішній. Де? Схід. Коли? Весна." }, { n: 3, riddle: "Завжди готовий допомогти — доброта його виявляється у зціленні. Звернений до Іншого з любов'ю. Там, де порожнеча. Осінь — час зустрічі.", hint: "Хто? Діалогічний. Де? Північ. Коли? Осінь." }],
  [{ n: 1, riddle: "Мовчання стало його єством — в ньому немає нічого, крім чистої тиші. Колективний — але порожній. В найхолоднішій, найпустішій точці. Зима вічності.", hint: "Хто? Колективний. Де? Північ. Коли? Зима." }, { n: 2, riddle: "Братерство — не організація, а стан буття. Він несе колективну мудрість усіх. Там, де спека найбільша. Літній розквіт єдності.", hint: "Хто? Колективний. Де? Південь. Коли? Літо." }, { n: 3, riddle: "Усі, хто живе в істині — вже в його лоні. Єдність усього. Колективний — у найпалкішій точці.", hint: "Хто? Колективний. Де? Південь. Коли? Літо." }],
  [{ n: 1, riddle: "Братерство без меж — він є усіма й одночасно одним. Колективний. Там, де вогонь найяскравіший. Літо не знає меж.", hint: "Хто? Колективний. Де? Південь. Коли? Літо." }, { n: 2, riddle: "Сила зростає через тишу і невидимість. Зовнішній — той, кого відчувають, але не бачать. Зі Сходу. Весняний дух.", hint: "Хто? Зовнішній. Де? Схід. Коли? Весна." }, { n: 3, riddle: "Терпіння як камінь. Не піддається ні грубій силі, ні раптовому нападу. Внутрішній. Там, де схід сонця. Зимова непохитність.", hint: "Хто? Внутрішній. Де? Схід. Коли? Зима." }],
  [{ n: 1, riddle: "Братерство народжується через союз. Колективний — і несе в собі пам'ять Сходу. Осінь — час дозрілих союзів.", hint: "Хто? Колективний. Де? Схід. Коли? Осінь." }, { n: 2, riddle: "Надія тверда — ґрунтується на знанні. Колективний початок. Той самий Схід. Весна — час закладення.", hint: "Хто? Колективний. Де? Схід. Коли? Весна." }, { n: 3, riddle: "Терпіння чекало — і ось час жнив. Колективний. Там, де спека не вщухає. Осінній урожай.", hint: "Хто? Колективний. Де? Південь. Коли? Осінь." }],
  [{ n: 1, riddle: "Велике Коло. Той, хто з'являвся в Апофеозі. Братерство — єдність — Колективний. Там, де палає найспекотніше. Літо абсолюту.", hint: "Хто? Колективний. Де? Південь. Коли? Літо." }, { n: 2, riddle: "Той, хто кидав виклик у Рубедо. Не думає зла — бо кожен крок наперед є актом чистої ініціативи. Внутрішній. Схід. Весна.", hint: "Хто? Внутрішній. Де? Схід. Коли? Весна." }, { n: 3, riddle: "Той, хто очищав в Альбедо. Без хвастощів — чекає вказівок Вчителя. Діалогічний. Там, де день згасає. Осінь мудрості.", hint: "Хто? Діалогічний. Де? Захід. Коли? Осінь." }],
];

const RECOVERY = [
  { id: "meditate", icon: "🧘", name: "Медитація", cost: "−8 Чистоти", gain: "+25 ☿ +25 🔥 +25 🧂", col: "#7dcfff", limit: 3, can: g => g.purity > 8 && (g.recov.meditate || 0) < 3, apply: g => ({ ...g, purity: Math.max(0, g.purity - 8), resources: { ...g.resources, mercury: Math.min(MAX_RES, g.resources.mercury + 25), sulfur: Math.min(MAX_RES, g.resources.sulfur + 25), salt: Math.min(MAX_RES, g.resources.salt + 25) }, recov: { ...g.recov, meditate: (g.recov.meditate || 0) + 1 } }) },
  { id: "distill", icon: "⚗", name: "Дистиляція", cost: "−20 ☿ −20 🔥", gain: "+5 💧 Азоту", col: "#c084fc", limit: 5, can: g => g.resources.mercury >= 20 && g.resources.sulfur >= 20 && (g.recov.distill || 0) < 5, apply: g => ({ ...g, resources: { ...g.resources, mercury: g.resources.mercury - 20, sulfur: g.resources.sulfur - 20, azoth: Math.min(MAX_AZOTH, g.resources.azoth + 5) }, recov: { ...g.recov, distill: (g.recov.distill || 0) + 1 } }) },
  { id: "gather", icon: "🌿", name: "Збір у природі", cost: "Без витрат", gain: "+15–40 випадкових", col: "#4ade80", limit: 4, can: g => (g.recov.gather || 0) < 4, apply: g => { const dm = Math.floor(Math.random() * 25) + 15, ds = Math.floor(Math.random() * 20) + 10; return { ...g, resources: { ...g.resources, mercury: Math.min(MAX_RES, g.resources.mercury + dm), salt: Math.min(MAX_RES, g.resources.salt + ds) }, recov: { ...g.recov, gather: (g.recov.gather || 0) + 1 } }; } },
  { id: "sacrifice", icon: "🩸", name: "Жертва крові", cost: "−20 Чистоти", gain: "+50 ☿🔥🧂 +5 💧", col: "#f07070", limit: 1, can: g => g.purity > 20 && !(g.recov.sacrifice), apply: g => ({ ...g, purity: Math.max(0, g.purity - 20), resources: { ...g.resources, mercury: Math.min(MAX_RES, g.resources.mercury + 50), sulfur: Math.min(MAX_RES, g.resources.sulfur + 50), salt: Math.min(MAX_RES, g.resources.salt + 50), azoth: Math.min(MAX_AZOTH, g.resources.azoth + 5) }, recov: { ...g.recov, sacrifice: true } }) },
];

const WHO_VALS = ["ME", "WE", "YOU", "THEY"];
const WHERE_VALS = ["NORTH", "SOUTH", "EAST", "WEST"];
const WHEN_VALS = ["WINTER", "SPRING", "SUMMER", "AUTUMN"];
const WHO_UA = { ME: "Я", WE: "Ми", YOU: "Ти", THEY: "Вони" };
const WHERE_UA = { NORTH: "Північ", SOUTH: "Південь", EAST: "Схід", WEST: "Захід" };
const WHEN_UA = { WINTER: "Зима", SPRING: "Весна", SUMMER: "Літо", AUTUMN: "Осінь" };
const WHO_POETIC = { ME: "самотнє Я", WE: "спільнота Ми", YOU: "звернене до Іншого Ти", THEY: "безликі Вони зовні" };
const WHERE_POETIC = { NORTH: "крижана Північ", WEST: "сутінковий Захід", EAST: "сонячний Схід", SOUTH: "палкий Південь" };
const WHEN_POETIC = { WINTER: "мертва Зима", AUTUMN: "осінній смуток", SPRING: "весняна надія", SUMMER: "літній зеніт" };

function getInspiration(ing1, ing2, targetBin) {
  const needBin = transmute(ing1.bin, ing2.bin, targetBin); const need = ga(needBin); if (!need) return null;
  const sameWho = need.who === ing1.who && need.who === ing2.who;
  return {
    bin: needBin, name: need.name, key: need.key, who: need.who, where: need.where, when: need.when,
    line1: sameWho ? `Залишається з роду «${WHO_POETIC[need.who]}»` : `Шукай у роді «${WHO_POETIC[need.who]}»`,
    line2: `${WHERE_POETIC[need.where]}, ${WHEN_POETIC[need.when]}`, line3: `Ключ: «${need.key}»`
  };
}

// ── ARCHETYPE VISUAL + SOUND SYSTEM (canonical SUBIT-64 bit encoding) ──
// bits[0:2] = WHO:  00=THEY, 01=YOU, 10=ME, 11=WE
// bits[2:4] = WHERE: 00=NORTH, 01=WEST, 10=EAST, 11=SOUTH
// bits[4:6] = WHEN:  00=WINTER, 01=AUTUMN, 10=SPRING, 11=SUMMER

// SHAPE by WHO bits (1-2) — silhouette expresses inner nature
const WHO_CLIP = {
  "00": "circle(48%)",                                                       // THEY: formless outer circle
  "01": "polygon(0% 0%,100% 0%,80% 100%,20% 100%)",                        // YOU: trapezoid, open upward, dialogue
  "10": "polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)",               // ME: pentagon, inward pointing
  "11": "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)",       // WE: hexagon, collective symmetry
};

// TEXTURE by WHERE bits (3-4) — spatial & elemental character
const WHERE_TEXTURE = {
  "00": (c) => `radial-gradient(circle at 28% 28%,${c}28,transparent 70%)`,  // NORTH: cold, sparse
  "01": (c) => `linear-gradient(135deg,${c}18,${c}36 50%,transparent), repeating-linear-gradient(60deg,${c}06 0px,${c}06 1px,transparent 1px,transparent 5px)`, // WEST: ember lines
  "10": (c) => `repeating-linear-gradient(90deg,${c}12 0px,${c}12 3px,transparent 3px,transparent 7px), radial-gradient(ellipse at 62% 20%,${c}28,transparent 55%)`,  // EAST: morning rays
  "11": (c) => `radial-gradient(circle at 50% 58%,${c}55,${c}28 40%,transparent 72%)`, // SOUTH: heat core
};

// GLOW by WHEN bits (5-6) — temporal energy & animation speed
const WHEN_GLOW_DATA = {
  "00": { spd: 4.2, col: "#a0c4ff", intensity: .28, blur: 6 },   // WINTER: slow, cold blue
  "01": { spd: 3.0, col: "#ffaa33", intensity: .52, blur: 9 },   // AUTUMN: amber, medium
  "10": { spd: 2.0, col: "#88ff88", intensity: .72, blur: 11 },  // SPRING: lively green
  "11": { spd: 1.4, col: "#ffcc00", intensity: 1.0, blur: 15 }, // SUMMER: fast, gold
};

// HERO OVERRIDES — 14 stage archetypes get hand-tuned shapes
const CLIP_OVERRIDE = {
  "000000": "circle(48%)",
  "001010": "circle(48%)",       // Ghost: pure circle (blurred via CSS filter)
  "010001": "polygon(50% 0%,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0% 50%,40% 40%)", // Beloved: heart-star
  "011111": "polygon(50% 0%,56% 38%,98% 38%,66% 62%,79% 100%,50% 76%,21% 100%,34% 62%,2% 38%,44% 38%)", // Sage: 5-star
  "100111": "polygon(50% 0%,100% 50%,50% 100%,0% 50%)",  // Alchemist: diamond
  "101010": "polygon(0% 50%,30% 0%,100% 0%,100% 100%,30% 100%)", // Pioneer: arrow
  "101100": "polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)", // Steadfast: hexagon
  "101111": "polygon(10% 10%,90% 10%,90% 90%,10% 90%)",  // Fulfilled: square
  "110111": "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)", // Council: 8-star
  "111010": "polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)", // Inception: pentagon
  "111011": "polygon(50% 0%,58% 42%,100% 28%,72% 72%,100% 100%,50% 80%,0% 100%,28% 72%,0% 28%,42% 42%)", // Alliance: 6-star
  "111101": "polygon(20% 0%,80% 0%,100% 50%,80% 100%,20% 100%,0% 50%)", // Harvest: wide hexagon
  "111111": "polygon(50% 0%,54% 46%,100% 50%,54% 54%,50% 100%,46% 54%,0% 50%,46% 46%)", // Conciliar: 4-star
};

function getArchClip(arch) { return CLIP_OVERRIDE[arch.bin] || WHO_CLIP[arch.bin.slice(0, 2)] || "circle(48%)"; }
function getArchTexture(arch, col) { return WHERE_TEXTURE[arch.bin.slice(2, 4)]?.(col) || ""; }
function getArchGlowStyle(arch, col, active) {
  const g = WHEN_GLOW_DATA[arch.bin.slice(4, 6)] || WHEN_GLOW_DATA["00"];
  const i = active ? g.intensity : g.intensity * .4;
  const hero = { "000000": "0 0 16px rgba(255,255,255,.06)", "001010": `0 0 20px ${col}44,0 0 38px ${col}18`, "110111": `0 0 22px ${col}cc,0 0 44px ${col}66`, "111111": `0 0 26px ${col},0 0 54px ${col}88` };
  return hero[arch.bin] || `0 0 ${Math.round(g.blur * i)}px ${g.col}${Math.round(i * 220).toString(16).padStart(2, "0")}`;
}

// Hover transform: every bit drives a physical axis
function getArchHoverStyle(arch) {
  const who = parseInt(arch.bin.slice(0, 2), 2); // 0-3
  const where = parseInt(arch.bin.slice(2, 4), 2);
  const when = parseInt(arch.bin.slice(4, 6), 2);
  return {
    scale: 1.0 + when * 0.025,              // SUMMER=+7.5%, WINTER=flat
    rotate: (where - 1.5) * 2.5,            // EAST→right, WEST→left
    brightness: 0.9 + who * 0.08,           // ME brightest, THEY dimmest
    dur: (0.15 + when * 0.07).toFixed(2),
  };
}

// CSS filter override for special archetypes
const ARCH_FILTER_OVERRIDE = {
  "000000": "brightness(0.65) contrast(1.35)",
  "001010": "blur(0.9px) brightness(1.35)",
  "101100": "drop-shadow(0 3px 5px rgba(139,69,19,.8))",
  "101010": "brightness(1.3) saturate(1.5)",
  "111111": "brightness(1.45) saturate(1.25) hue-rotate(6deg)",
  "110111": "brightness(1.35) sepia(.18)",
  "010001": "brightness(1.2) saturate(1.3)",
};
function getArchFilter(arch, hovered) {
  if (!hovered) return "none";
  return ARCH_FILTER_OVERRIDE[arch.bin] || `brightness(${(0.9 + parseInt(arch.bin.slice(0, 2), 2) * 0.08).toFixed(2)})`;
}

// Unique per-arch CSS keyframes driven by bits — pre-generated once
function buildArchKeyframes(bin) {
  const where = parseInt(bin.slice(2, 4), 2);
  const when = parseInt(bin.slice(4, 6), 2);
  const who = parseInt(bin.slice(0, 2), 2);
  const mx = ((where - 1.5) * 12).toFixed(1);
  const my = ((when - 1.5) * 9).toFixed(1);
  const rot = ((who - 1.5) * 4).toFixed(1);
  const spd = (2 + when).toFixed(1);
  return `@keyframes am-${bin}{0%,100%{transform:translate(0,0) rotate(0deg)}33%{transform:translate(${mx}px,${my}px) rotate(${rot}deg)}66%{transform:translate(${(-mx)}px,${my}px) rotate(${(-rot)}deg)}}`;
}
const ALL_ARCH_KEYFRAMES = (() => { let r = ""; for (let i = 0; i < ALL.length; i++)r += buildArchKeyframes(ALL[i].bin) + "\n"; return r; })();

// SOUND: bit-algebraic frequency/timbre generation
function getArchSoundParams(arch) {
  const who = parseInt(arch.bin.slice(0, 2), 2);   // 0=THEY,1=YOU,2=ME,3=WE
  const where = parseInt(arch.bin.slice(2, 4), 2); // 0=NORTH,1=WEST,2=EAST,3=SOUTH
  const when = parseInt(arch.bin.slice(4, 6), 2);  // 0=WINTER,1=AUTUMN,2=SPRING,3=SUMMER
  const baseFreq = 180 + who * 55 + where * 28 + when * 14;
  const types = ["sawtooth", "triangle", "sine", "sine"];
  const dur = 0.12 + when * 0.06;
  const vol = 0.06 + where * 0.02 + who * 0.015;
  const ov = {
    "000000": { freq: 82, type: "sine", dur: .55, vol: .04 },
    "001010": { freq: 660, type: "sine", dur: .48, vol: .06 },
    "101100": { freq: 175, type: "triangle", dur: .11, vol: .17 },
    "101010": { freq: 445, type: "sawtooth", dur: .14, vol: .13 },
    "110111": { freq: 528, type: "sine", dur: .42, vol: .13 },
    "111111": { freq: 792, type: "sine", dur: .52, vol: .11 },
    "100111": { freq: 370, type: "triangle", dur: .22, vol: .14 },
    "011111": { freq: 660, type: "sine", dur: .38, vol: .10 },
    "010001": { freq: 554, type: "sine", dur: .32, vol: .09 },
  };
  return ov[arch.bin] || { freq: baseFreq, type: types[who], dur, vol };
}
// SOUND polyphony guard
let _activeSounds = 0;
const _guardedTone = (f, t, d, v, dl = 0) => { if (_activeSounds >= 4) return; _activeSounds++; const ctx = getCtx(); if (ctx) { const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = t; o.frequency.value = f; const s = ctx.currentTime + (dl || 0); g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + .01); g.gain.exponentialRampToValueAtTime(.001, s + d); o.start(s); o.stop(s + d + .05); o.onended = () => { _activeSounds = Math.max(0, _activeSounds - 1); }; } };
function playArchSound(arch) {
  const p = getArchSoundParams(arch);
  tone(p.freq, p.type, p.dur, p.vol);
  if (arch.who === "WE") _guardedTone(p.freq * 1.5, p.type, p.dur * .7, p.vol * .5, .04); // collective: harmonic only if polyphony budget allows
  if (arch.bin === "001010") _guardedTone(p.freq * 1.5, "sine", .65, .04, .1);          // Ghost: ethereal overtone
  if (arch.bin === "000000") noise(.4, .03, 0, 150);                                   // Zero: subsonic rumble
}


// ── CSS ──
const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:2px;}::-webkit-scrollbar-thumb{background:#1e1408;border-radius:1px;}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes floatR{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-7px) rotate(4deg)}}
@keyframes flame{0%,100%{transform:scaleY(1) scaleX(1)}35%{transform:scaleY(1.14) scaleX(.88)}68%{transform:scaleY(.92) scaleX(1.08)}}
@keyframes liquid{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes liquidFast{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes bubble{0%{transform:translateY(100%) scale(0);opacity:0}60%{opacity:.9}100%{transform:translateY(-120%) scale(1.2);opacity:0}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes slideUp{from{transform:translateY(48px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes slideDown{from{transform:translateY(-16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes sheetIn{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes shakeV{0%,100%{transform:translateY(0)}25%{transform:translateY(-5px)}75%{transform:translateY(5px)}}
@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes pulseScale{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes ringOut{0%{transform:translate(-50%,-50%) scale(.3);opacity:.9}100%{transform:translate(-50%,-50%) scale(3.2);opacity:0}}
@keyframes burstStar{0%{opacity:0;transform:scale(.2) rotate(0deg)}30%{opacity:1;transform:scale(1.1) rotate(120deg)}100%{opacity:0;transform:scale(.3) rotate(360deg)}}
@keyframes victorySpin{0%,100%{transform:rotate(0) scale(1)}50%{transform:rotate(18deg) scale(1.08)}}
@keyframes parchIn{from{transform:translateY(56px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
@keyframes revealIn{from{transform:translateY(-24px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(8px,-12px) scale(1.05)}66%{transform:translate(-6px,8px) scale(.96)}}
@keyframes cycleGlow{0%,100%{opacity:.7}50%{opacity:1}}
@keyframes sparkUp{0%{transform:translateY(0) translateX(0) scale(1);opacity:.9}100%{transform:translateY(-60px) translateX(var(--sx,0px)) scale(0);opacity:0}}
@keyframes rayOut{0%{transform:translate(-50%,-50%) rotate(var(--angle)) scaleX(0);opacity:.9}100%{transform:translate(-50%,-50%) rotate(var(--angle)) scaleX(1);opacity:0}}
@keyframes cardIn{0%{transform:scale(.6) rotate(-8deg);opacity:0}70%{transform:scale(1.08) rotate(2deg)}100%{transform:scale(1) rotate(0deg);opacity:1}}
@keyframes cardOut{0%{transform:scale(1);opacity:1}100%{transform:scale(.3) rotate(12deg);opacity:0}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 18px var(--gc,#c8900a)55,0 0 40px var(--gc,#c8900a)18}50%{box-shadow:0 0 32px var(--gc,#c8900a)99,0 0 70px var(--gc,#c8900a)44}}
@keyframes resonanceRing{0%{transform:scale(.5);opacity:.8;border-width:3px}100%{transform:scale(2.8);opacity:0;border-width:1px}}
@keyframes scarSmolder{0%,100%{opacity:.28}50%{opacity:.18}}
@keyframes matchGlow{0%,100%{box-shadow:0 0 10px #e8d44d66;border-color:#e8d44daa}50%{box-shadow:0 0 22px #e8d44dcc,0 0 44px #e8d44d44;border-color:#e8d44d}}
@keyframes readyGlow{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.012);filter:brightness(1.18)}}
@keyframes sparkRing{0%{opacity:.85;transform:rotate(var(--a,0deg)) translateX(22px) scale(1)}80%{opacity:.1}100%{opacity:0;transform:rotate(var(--a,0deg)) translateX(40px) scale(.3)}}
@keyframes tabFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@media(min-width:600px){
  .gm-root{display:flex;align-items:stretch;justify-content:center;background:#010100;}
  .gm-sidebar{width:280px;flex-shrink:0;border-right:1px solid #1e1408;display:flex;flex-direction:column;padding:20px 16px;gap:14px;overflow-y:auto;background:linear-gradient(180deg,#0e0c04,#080600);}
  .gm-main{flex:1;max-width:480px;display:flex;flex-direction:column;border-right:1px solid #1e1408;}
  .gm-right{width:220px;flex-shrink:0;padding:16px 12px;overflow-y:auto;background:linear-gradient(180deg,#080600,#0e0c04);}
}
@media(max-width:599px){.gm-sidebar,.gm-right{display:none;}}
@media(orientation:landscape)and(max-height:500px){
  .gm-sheet{max-height:95vh!important;}
  .gm-sheet-inner{padding:8px 12px 14px!important;}
}
`;

// ── ALCHEMIST CYCLE ──
function AlchemistCycle({ step, stageCol }) {
  const steps = [
    { icon: "📖", tip: "Читай загадку" },
    { icon: "🔍", tip: "Застосовуй фільтри" },
    { icon: "⚗", tip: "Обирай архетипи" },
    { icon: "🌡", tip: "Налаштуй температуру" },
    { icon: "⚡", tip: "Проведи реакцію" },
  ];
  return (<div style={{ display: "flex", gap: 2, alignItems: "center" }}>
    {steps.map((s, i) => { const active = step === i + 1; const done = step > i + 1; return (<div key={i} title={s.tip} style={{ width: active ? 28 : 18, height: 18, borderRadius: 5, background: active ? `${stageCol}44` : done ? "#1e1a08" : "#0e0c06", border: `1px solid ${active ? stageCol : done ? "#3a2810" : "#1a1208"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: active ? 9 : 8, transition: "all .3s", opacity: done ? .5 : 1, animation: active ? "cycleGlow 1.5s ease-in-out infinite" : "none", boxShadow: active ? `0 0 8px ${stageCol}55` : "none" }}>{done ? "✓" : active ? s.icon : "·"}</div>); })}
  </div>);
}

// ── PARTICLE SPRAY (athanor sparks) ──
function ParticleSpray({ heat, color }) {
  const count = heat > 600 ? 10 : heat > 400 ? 6 : heat > 200 ? 3 : 0;
  if (count === 0) return null;
  return (<div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, height: 80, pointerEvents: "none", overflow: "visible" }}>
    {[...Array(count)].map((_, i) => {
      const sx = (Math.random() * 60 - 30).toFixed(0);
      const delay = (Math.random() * 1.2).toFixed(2);
      const dur = (0.7 + Math.random() * 0.8).toFixed(2);
      const left = (20 + Math.random() * 60).toFixed(0);
      const size = 2 + Math.random() * 3;
      return (<div key={i} style={{
        position: "absolute", bottom: 0, left: `${left}%`,
        width: size, height: size, borderRadius: "50%",
        background: color, boxShadow: `0 0 ${size * 2}px ${color}`,
        opacity: 0,
        "--sx": `${sx}px`,
        animation: `sparkUp ${dur}s ease-out ${delay}s infinite`,
      }} />);
    })}
  </div>);
}

// ── RESONANCE RINGS ──
function ResonanceRings({ color, active }) {
  if (!active) return null;
  return (<div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 2 }}>
    {[0, 1, 2].map(i => (<div key={i} style={{
      position: "absolute", top: "50%", left: "50%",
      width: 60, height: 60, borderRadius: "50%",
      border: `2px solid ${color}`,
      transform: "translate(-50%,-50%)",
      animation: `resonanceRing 1.8s ease-out ${i * 0.6}s infinite`,
    }} />))}
  </div>);
}

// ── MUSIC INDICATOR ──
function MusicIndicator({ sound }) {
  const season = Music._season; const p = season ? SEASON_PATTERNS[season] : null;
  if (!sound || !p) return null;
  return (<div style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", background: "rgba(0,0,0,.4)", borderRadius: 8, border: `1px solid ${p.color}33` }}>
    <div style={{ display: "flex", gap: 1.5, alignItems: "flex-end", height: 10 }}>
      {[1, .6, .8, .4, .7].map((h, i) => (<div key={i} style={{ width: 2, height: 10 * h, background: p.color, borderRadius: 1, animation: `pulse ${.4 + i * .1}s ease-in-out ${i * .08}s infinite`, opacity: .8 }} />))}
    </div>
    <span style={{ fontSize: 8.5, color: p.color, fontFamily: "monospace", letterSpacing: 0.5 }}>{p.label}</span>
  </div>);
}

// ── TYPEWRITER ──
function Typewriter({ text, speed = 20, onDone }) {
  const [n, setN] = useState(0); const ref = useRef(0);
  useEffect(() => { ref.current = 0; setN(0); const t = setInterval(() => { if (ref.current < text.length) { ref.current++; setN(ref.current); } else { clearInterval(t); onDone?.(); } }, speed); return () => clearInterval(t); }, [text]);
  return (<span style={{ whiteSpace: "pre-wrap" }}>{text.slice(0, n)}{n < text.length && <span style={{ animation: "blink .8s step-end infinite", color: "#b8870a" }}>│</span>}</span>);
}

// ── FLAME ──
function Flame({ heat }) {
  const p = heat / MAX_HEAT; const c1 = p > .75 ? "#ff2a2a" : p > .45 ? "#ff8800" : "#d4870f"; const c2 = p > .75 ? "#ff9900" : p > .45 ? "#fbbf24" : "#b06010";
  const sparkCol = p > .75 ? "#ff6020" : p > .45 ? "#ffaa20" : "#e8c040";
  return (<div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", height: 72, gap: 3, position: "relative" }}>
    <ParticleSpray heat={heat} color={sparkCol} />
    {[.58, .92, .76, 1.12, .68, .86, .52].map((s, i) => (<div key={i} style={{ width: 9, height: Math.max(4, p * 68 * s), background: `linear-gradient(to top,${c1},${c2},transparent)`, borderRadius: "50% 50% 32% 32%", animation: `flame ${.6 + i * .12}s ease-in-out ${i * .07}s infinite`, opacity: heat < 5 ? .06 : .78, filter: "blur(.4px)", transition: "height .5s,background .7s" }} />))}
  </div>);
}

// ── VESSEL ── (restored with reacting, failShake, next-slot pulse, resonance rings)
function Vessel({ arch, slot, slotIdx, totalFilled, onRemove, reacting, failShake, resonance }) {
  const col = arch ? ac(arch.who, arch.where, arch.when) : null;
  const isNextSlot = !arch && totalFilled === slotIdx;
  return (<div style={{
    width: "31%", minHeight: 110,
    background: arch ? `linear-gradient(170deg,${col}14,#07050200)` : "#0a0703",
    border: `1.5px solid ${arch ? col + "55" : isNextSlot ? "#c8900a55" : "#1a1108"}`,
    borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 4, padding: "10px 5px", position: "relative", transition: "all .25s",
    animation: failShake && arch ? "shakeV .4s ease" : isNextSlot ? "pulseScale 1.8s ease-in-out infinite" : "none",
    boxShadow: arch ? `0 0 22px ${col}18,inset 0 0 14px ${col}07` : isNextSlot ? "0 0 14px #c8900a22,inset 0 0 8px #c8900a08" : "inset 0 0 14px rgba(0,0,0,.3)"
  }}>
    {resonance && arch && <ResonanceRings color={col} active={true} />}
    <div style={{ fontSize: 11, color: arch ? col + "44" : isNextSlot ? "#c8900a55" : "#5a3820", letterSpacing: 3, fontFamily: "monospace", fontWeight: 700, marginBottom: 2, position: "relative", zIndex: 3 }}>{slot}</div>
    {arch ? (<>
      <div style={{ width: 9, height: 7, background: `${col}22`, borderRadius: "2px 2px 0 0", border: `1px solid ${col}33`, borderBottom: "none", position: "relative", zIndex: 3 }} />
      <div style={{ width: 40, height: 52, position: "relative", borderRadius: "38% 38% 48% 48%", border: `1.5px solid ${col}55`, overflow: "hidden", background: `linear-gradient(160deg,${col}10,#07050200)`, boxShadow: `inset 0 -2px 10px ${col}22`, zIndex: 3 }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "58%", background: `linear-gradient(to top,${col},${col}77)`, borderRadius: "0 0 46% 46%", animation: reacting ? "liquidFast .8s ease-in-out infinite" : "liquid 2.5s ease-in-out infinite" }} />
        {reacting && [...Array(3)].map((_, i) => (<div key={i} style={{ position: "absolute", bottom: "30%", left: `${20 + i * 25}%`, width: 4, height: 4, borderRadius: "50%", background: col, animation: `bubble ${.8 + i * .3}s ease-out ${i * .2}s infinite`, opacity: .7 }} />))}
        {/* Archetype shape emblem inside vessel */}
        <div style={{ position: "absolute", top: "18%", left: "50%", transform: "translateX(-50%)", width: 16, height: 16, background: col, clipPath: getArchClip(arch), opacity: .45, filter: "blur(0.3px)" }} />
        <div style={{ position: "absolute", top: 7, left: 7, width: 5, height: 10, background: "rgba(255,255,255,.14)", borderRadius: "50%", transform: "rotate(-18deg)" }} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: col, fontFamily: "Georgia,serif", textAlign: "center", lineHeight: 1.15, maxWidth: "100%", padding: "0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", position: "relative", zIndex: 3, animation: "cardIn .3s ease" }}>{arch.name}</div>
      <button onClick={onRemove} style={{ position: "absolute", top: 5, right: 6, background: "none", border: "none", color: "#7a4820", fontSize: 13, cursor: "pointer", lineHeight: 1, padding: 2, opacity: .7, zIndex: 4 }}>✕</button>
    </>) : (<div style={{ fontSize: 28, color: isNextSlot ? "#c8900a44" : "#141008", lineHeight: 1, marginTop: 4, opacity: isNextSlot ? .7 : .5, position: "relative", zIndex: 3 }}>○</div>)}
  </div>);
}

// ── FILTER BTN ──
function FilterBtn({ label, active, col, onClick }) {
  return (<button onClick={onClick} style={{ padding: "5px 9px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontFamily: "Georgia,serif", fontWeight: active ? 700 : 400, background: active ? col + "33" : "#0e0c06", border: `1px solid ${active ? col : "#2a1c0a"}`, color: active ? col : "#7a5828", transition: "all .12s", boxShadow: active ? `0 0 8px ${col}44` : "none" }}>{label}</button>);
}

// ── DEDUCTIVE PANEL ── (restored filter progress bar + narrowing feedback)
const DeductivePanel = React.memo(function DeductivePanel({ stageIdx, ingredients, onAdd, onRemove, busy, stageCol }) {
  const riddles = STAGE_RIDDLES[stageIdx - 1] || [];
  const [filterWho, setFilterWho] = useState(null);
  const [filterWhere, setFilterWhere] = useState(null);
  const [filterWhen, setFilterWhen] = useState(null);
  const [revealedHints, setRevealedHints] = useState({});
  const [activeRiddle, setActiveRiddle] = useState(0);
  const currentRiddle = riddles[Math.min(activeRiddle, riddles.length - 1)];

  const filtered = useMemo(() => ALL.filter(a => {
    if (filterWho && a.who !== filterWho) return false;
    if (filterWhere && a.where !== filterWhere) return false;
    if (filterWhen && a.when !== filterWhen) return false;
    return true;
  }), [filterWho, filterWhere, filterWhen]);

  const clearFilters = () => { setFilterWho(null); setFilterWhere(null); setFilterWhen(null); };
  const hasFilter = filterWho || filterWhere || filterWhen;
  const isNarrow = filtered.length <= 5 && hasFilter;
  const isSuperNarrow = filtered.length <= 2 && hasFilter;

  return (<div style={{ marginBottom: 12 }}>
    {/* Riddle tabs */}
    <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
      {riddles.map((r, i) => {
        const filled = ingredients[i]; const fc = filled ? ac(filled.who, filled.where, filled.when) : null; return (<button key={i} onClick={() => setActiveRiddle(i)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, cursor: "pointer", background: activeRiddle === i ? (filled ? fc + "22" : stageCol + "22") : "#0e0c06", border: `1.5px solid ${activeRiddle === i ? (filled ? fc : stageCol) + "66" : "#2a1c0a"}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all .15s" }}>
          <div style={{ fontSize: 12, color: "#6a4818", fontFamily: "monospace" }}>Реагент {i + 1}</div>
          {filled ? (<div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: fc, boxShadow: `0 0 6px ${fc}` }} /><div style={{ fontSize: 11, color: fc, fontWeight: 700, fontFamily: "Georgia,serif" }}>{filled.name}</div></div>) : (<div style={{ fontSize: 11, color: activeRiddle === i ? stageCol + "aa" : "#4a2e10", fontStyle: "italic" }}>{activeRiddle === i ? "▶ активна" : "не вибрано"}</div>)}
        </button>);
      })}
    </div>

    {/* Active riddle */}
    {currentRiddle && (<div style={{ background: `linear-gradient(145deg,#1a1608,#0e0c04)`, border: `1px solid ${stageCol}44`, borderRadius: 14, padding: "14px", marginBottom: 10, boxShadow: `0 0 20px ${stageCol}0a` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${stageCol}22`, border: `1px solid ${stageCol}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{currentRiddle.n}</div>
        <div><div style={{ fontSize: 10, color: stageCol + "aa", letterSpacing: 2, fontFamily: "monospace", fontWeight: 600 }}>ЗАГАДКА РЕАГЕНТУ</div>{ROSE_Q[currentRiddle.n - 1] && <div style={{ fontSize: 10.5, color: "#c8900a88", fontStyle: "italic" }}>✦ {ROSE_Q[currentRiddle.n - 1].icon} {ROSE_Q[currentRiddle.n - 1].title}</div>}</div>
        {revealedHints[activeRiddle] && <div style={{ marginLeft: "auto", fontSize: 10, color: stageCol + "88", background: `${stageCol}11`, borderRadius: 6, padding: "3px 8px", border: `1px solid ${stageCol}22` }}>💡 підказка</div>}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.85, color: "#f0d060", fontFamily: "Georgia,serif", fontStyle: "italic", marginBottom: 10, padding: "10px 12px", background: "rgba(0,0,0,.3)", borderRadius: 10, borderLeft: `3px solid ${stageCol}55` }}>{currentRiddle.riddle}</div>
      {!revealedHints[activeRiddle] ? (<button onClick={() => setRevealedHints(p => ({ ...p, [activeRiddle]: true }))} style={{ background: "transparent", border: `1px solid #c8900a33`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: "#8a6030", fontFamily: "Georgia,serif", fontStyle: "italic" }}>↳ Відкрити ключ-підказку</button>) : (<div style={{ fontSize: 12, color: "#c89040", padding: "6px 10px", background: "#1a1208", borderRadius: 8, border: "1px solid #c8900a33", fontStyle: "italic", lineHeight: 1.6 }}>🗝 {currentRiddle.hint}</div>)}
    </div>)}

    {/* Filters with progress bar */}
    <div style={{ background: "#0c0a04", borderRadius: 12, padding: "10px", marginBottom: 8, border: `1px solid ${isNarrow ? "#c8900a55" : "#2a1c0a"}`, transition: "border-color .3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "#7a5020", letterSpacing: 2, fontFamily: "monospace", fontWeight: 600 }}>ФІЛЬТР</div>
        <div style={{ flex: 1, height: 4, background: "#1a1206", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${(filtered.length / 64) * 100}%`, height: "100%", background: isSuperNarrow ? "#4ade80" : isNarrow ? "#e8d44d" : stageCol, borderRadius: 2, transition: "all .4s" }} />
        </div>
        <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: isSuperNarrow ? "#4ade80" : isNarrow ? "#e8d44d" : "#7a5020" }}>{filtered.length}/64</div>
        {hasFilter && <button onClick={clearFilters} style={{ background: "none", border: "none", color: "#c05030", cursor: "pointer", fontSize: 10, fontFamily: "monospace" }}>✕</button>}
      </div>
      {isSuperNarrow && <div style={{ fontSize: 11, color: "#4ade80", background: "#041a08", borderRadius: 7, padding: "4px 9px", marginBottom: 8, border: "1px solid #4ade8044", fontStyle: "italic" }}>✨ Майже знайдено — обирай з цих {filtered.length}!</div>}
      {isNarrow && !isSuperNarrow && <div style={{ fontSize: 11, color: "#e8d44d", background: "#1a1600", borderRadius: 7, padding: "4px 9px", marginBottom: 8, border: "1px solid #e8d44d33", fontStyle: "italic" }}>🎯 Залишилось лише {filtered.length} — придивись уважно</div>}

      <div style={{ marginBottom: 6 }}><div style={{ fontSize: 10, color: "#6a4010", marginBottom: 4, fontFamily: "monospace" }}>ХТО:</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{WHO_VALS.map(v => (<FilterBtn key={v} label={WHO_UA[v]} active={filterWho === v} col={`hsl(${WHO_HUE[v]},60%,58%)`} onClick={() => setFilterWho(p => p === v ? null : v)} />))}</div></div>
      <div style={{ marginBottom: 6 }}><div style={{ fontSize: 10, color: "#6a4010", marginBottom: 4, fontFamily: "monospace" }}>ДЕ:</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{WHERE_VALS.map(v => { const sat = { NORTH: 36, WEST: 50, EAST: 64, SOUTH: 74 }[v]; return (<FilterBtn key={v} label={WHERE_UA[v]} active={filterWhere === v} col={`hsl(200,${sat}%,58%)`} onClick={() => setFilterWhere(p => p === v ? null : v)} />); })}</div></div>
      <div><div style={{ fontSize: 10, color: "#6a4010", marginBottom: 4, fontFamily: "monospace" }}>КОЛИ:</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{WHEN_VALS.map(v => { const lit = { WINTER: 32, SPRING: 52, SUMMER: 62, AUTUMN: 42 }[v]; return (<FilterBtn key={v} label={WHEN_UA[v]} active={filterWhen === v} col={`hsl(35,70%,${lit + 20}%)`} onClick={() => setFilterWhen(p => p === v ? null : v)} />); })}</div></div>
    </div>

    {/* Grid */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, background: isNarrow ? "#0e0d04" : "transparent", borderRadius: 10, padding: isNarrow ? 6 : 0, transition: "all .3s", border: isNarrow ? "1px solid #e8d44d22" : "1px solid transparent" }}>
      {filtered.slice(0, 32).map(a => { const inSlot = ingredients.some(i => i.bin === a.bin); const full = ingredients.length >= 3 && !inSlot; const isMatch = isSuperNarrow && !inSlot && !full; return (<ArchCard key={a.bin} arch={a} inSlot={inSlot} full={full || busy} isReq={false} isMatch={isMatch} onClick={() => inSlot ? onRemove(ingredients.findIndex(i => i.bin === a.bin)) : onAdd(a)} />); })}
      {filtered.length > 32 && <div style={{ gridColumn: "1/-1", textAlign: "center", fontSize: 11, color: "#6a4010", padding: "8px", fontStyle: "italic" }}>Ще {filtered.length - 32} — уточни фільтри</div>}
      {filtered.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", fontSize: 13, color: "#c8900a", padding: "16px", fontStyle: "italic", fontFamily: "Georgia,serif" }}>Немає архетипів з такою комбінацією...</div>}
    </div>
  </div>);
});

// ── CODEX ──
function CodexPanel({ onClose }) {
  useEscClose(onClose);
  const [selected, setSelected] = useState(null); const q = selected !== null ? ROSE_Q[selected] : null;
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(4,2,0,.92)", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "linear-gradient(160deg,#1e1608,#120e04)", borderRadius: "22px 22px 0 0", border: "1px solid #c8900a33", borderBottom: "none", padding: "18px 14px 28px", animation: "sheetIn .3s cubic-bezier(.32,.72,0,1)", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,.8)" }}>
      <div style={{ width: 34, height: 4, background: "#c8900a55", borderRadius: 2, margin: "0 auto 12px" }} />
      <div style={{ textAlign: "center", marginBottom: 14 }}><div style={{ fontSize: 13, color: "#e8c040", fontWeight: 700, fontFamily: "Georgia,serif", letterSpacing: 1 }}>🌹 КОДЕКС РОЗЕНКРЕЙЦЕРА</div><div style={{ fontSize: 11, color: "#8a6030", fontStyle: "italic", marginTop: 3 }}>Шістнадцять якостей — ключ до архетипів</div></div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {selected === null ? (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{ROSE_Q.map((q, i) => (<button key={i} onClick={() => setSelected(i)} style={{ background: "#0e0c06", border: "1px solid #2a1c0a", borderRadius: 11, padding: "10px 8px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 18, flexShrink: 0 }}>{q.icon}</span><div><div style={{ fontSize: 10.5, color: "#c8900a", fontFamily: "monospace", marginBottom: 1 }}>{q.num}.</div><div style={{ fontSize: 12, color: "#e0c060", fontFamily: "Georgia,serif", fontWeight: 700, lineHeight: 1.2 }}>{q.title}</div></div></button>))}</div>) : (<div><button onClick={() => setSelected(null)} style={{ background: "transparent", border: "1px solid #c8900a33", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: "#c89040", marginBottom: 14, fontFamily: "Georgia,serif" }}>← Назад</button><div style={{ textAlign: "center", marginBottom: 16 }}><div style={{ fontSize: 44, marginBottom: 6 }}>{q.icon}</div><div style={{ fontSize: 11, color: "#c8900a", fontFamily: "monospace", marginBottom: 2 }}>ЯКІСТЬ {q.num}</div><div style={{ fontSize: 20, color: "#f0d060", fontFamily: "Georgia,serif", fontWeight: 700 }}>{q.title}</div><div style={{ width: 50, height: 1, background: "linear-gradient(to right,transparent,#c8900a,transparent)", margin: "10px auto" }} /></div><div style={{ fontSize: 14, lineHeight: 1.85, color: "#e0c060", fontFamily: "Georgia,serif", fontStyle: "italic", padding: "14px", background: "#0c0a04", borderRadius: 11, border: "1px solid #2a1c08" }}>{q.text}</div></div>)}
      </div>
    </div>
  </div>);
}

// ── SCREEN EFFECT ──
function ScreenEffect({ effect, onComplete }) {
  useEffect(() => { const t = setTimeout(onComplete, effect.type === "flash" ? 400 : 1800); return () => clearTimeout(t); }, []);
  const baseStyle = { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 699 };
  if (effect.type === "flash") return (<div style={{ ...baseStyle, background: effect.col, animation: "fadeIn .08s ease forwards, fadeIn .25s ease .08s reverse forwards", opacity: .35 }} />);
  if (effect.type === "radiate") {
    return (<div style={{ ...baseStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {[0, 1, 2].map(i => (<div key={i} style={{ position: "absolute", width: 200 + i * 120, height: 200 + i * 120, borderRadius: "50%", border: `2px solid ${effect.col}`, animation: `ringOut ${.8 + i * .3}s ease-out ${i * .2}s forwards` }} />))}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle,${effect.col}14,transparent 55%)`, animation: "fadeIn .3s ease" }} />
    </div>);
  }
  if (effect.type === "spin") return (<div style={{ ...baseStyle, background: `conic-gradient(from 0deg,transparent,${effect.col}18,transparent)`, animation: "spin 1.8s linear forwards", opacity: .6 }} />);
  // default glow
  return (<div style={{ ...baseStyle, background: `radial-gradient(ellipse at 50% 30%,${effect.col}20,transparent 62%)`, animation: "fadeIn .4s ease, fadeIn .8s ease 1s reverse forwards" }} />);
}

// ── ARCH LEGEND ──
function ArchLegend({ onClose }) {
  useEscClose(onClose);
  const examples = [
    { who: "00", where: "00", when: "00", label: "THEY·NORTH·WINTER", note: "Коло, холодна текстура, повільний пульс" },
    { who: "10", where: "11", when: "11", label: "ME·SOUTH·SUMMER", note: "П'ятикутник, теплий центр, швидкий пульс" },
    { who: "11", where: "01", when: "10", label: "WE·WEST·SPRING", note: "Шестикутник, вечірні лінії, жвавий пульс" },
    { who: "01", where: "10", when: "01", label: "YOU·EAST·AUTUMN", note: "Трапеція, ранкові смуги, бурштинне сяйво" },
  ];
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(2,1,0,.88)", zIndex: 460, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "linear-gradient(160deg,#1e1608,#100c04)", borderRadius: "22px 22px 0 0", border: "1px solid #c8900a33", padding: "18px 14px 28px", animation: "sheetIn .3s cubic-bezier(.32,.72,0,1)", boxShadow: "0 -8px 40px rgba(0,0,0,.8)" }}>
      <div style={{ width: 34, height: 4, background: "#c8900a55", borderRadius: 2, margin: "0 auto 14px" }} />
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "#e8c040", fontWeight: 700, fontFamily: "Georgia,serif", letterSpacing: 1 }}>🔍 МОВА АРХЕТИПІВ</div>
        <div style={{ fontSize: 11, color: "#8a6030", fontStyle: "italic", marginTop: 3 }}>Кожен біт несе сенс</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14, background: "#0c0a04", borderRadius: 10, padding: 10 }}>
        {[["Форма", "WHO (біти 1-2)", "○ ВОНИ · ▱ ТИ · ⬠ Я · ⬡ МИ", "#7dcfff"],
        ["Текстура", "WHERE (біти 3-4)", "Холод · Іскри · Смуги · Спека", "#f0c860"],
        ["Пульс", "WHEN (біти 5-6)", "Повільний→Швидкий за сезоном", "#4ade80"]
        ].map(([title, sub, desc, col]) => (<div key={title} style={{ textAlign: "center", padding: "8px 4px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: col, fontFamily: "monospace", marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 9.5, color: "#c8900a", marginBottom: 4 }}>{sub}</div>
          <div style={{ fontSize: 9, color: "#8a6030", lineHeight: 1.4, fontStyle: "italic" }}>{desc}</div>
        </div>))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {examples.map(ex => {
          const bin = ex.who + ex.where + ex.when;
          const col = ac(WHO_MAP[ex.who], WHERE_MAP[ex.where], WHEN_MAP[ex.when]);
          const clip = getArchClip({ bin, who: WHO_MAP[ex.who], where: WHERE_MAP[ex.where], when: WHEN_MAP[ex.when] });
          return (<div key={bin} style={{ background: "#0e0c06", border: `1px solid ${col}33`, borderRadius: 10, padding: "8px", display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, flexShrink: 0, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: col, clipPath: clip, opacity: .7 }} />
            </div>
            <div>
              <div style={{ fontSize: 9.5, color: col, fontFamily: "monospace", fontWeight: 700, marginBottom: 1 }}>{ex.label}</div>
              <div style={{ fontSize: 9, color: "#7a5020", fontStyle: "italic", lineHeight: 1.3 }}>{ex.note}</div>
            </div>
          </div>);
        })}
      </div>
    </div>
  </div>);
}

// ── ARCH CARD (memoized) ──
const ArchCard = React.memo(function ArchCard({ arch, inSlot, full, onClick, isReq, isMatch }) {
  const [hovered, setHovered] = useState(false);
  const col = ac(arch.who, arch.where, arch.when);
  const whoCol = `hsl(${WHO_HUE[arch.who]},65%,52%)`;
  const clickable = inSlot || !full;
  const clipPath = getArchClip(arch);
  const texture = getArchTexture(arch, col);
  const archGlow = getArchGlowStyle(arch, col, inSlot || hovered);
  const archFilter = getArchFilter(arch, hovered);
  const hover = getArchHoverStyle(arch);
  const isGhost = arch.bin === "001010";
  const isZero = arch.bin === "000000";
  const g = WHEN_GLOW_DATA[arch.bin.slice(4, 6)] || WHEN_GLOW_DATA["00"];

  return (<div
    onClick={clickable ? onClick : undefined}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    style={{
      background: inSlot ? `linear-gradient(170deg,${col}22,#0a0806)` : isMatch ? `linear-gradient(170deg,${col}28,#100e02)` : isReq ? `${col}10` : "#0e0c06",
      border: `1.5px solid ${inSlot ? col : isMatch ? col : isReq ? col + "88" : hovered ? col + "55" : "#2a1c0a"}`,
      borderRadius: 10, padding: "7px 4px 6px", cursor: clickable ? "pointer" : "default",
      opacity: full && !inSlot ? .2 : 1,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      transition: `all ${hover.dur}s ease`, position: "relative", overflow: "hidden",
      boxShadow: inSlot ? `0 0 16px ${col}55,inset 0 0 10px ${col}14` : isMatch ? `0 0 14px ${col}88,0 0 28px ${col}33` : hovered ? `0 0 12px ${col}55` : "none",
      animation: isMatch ? "matchGlow 2s ease-in-out infinite" : "none",
      transform: hovered && clickable ? `translateY(-1px) scale(${hover.scale}) rotate(${hover.rotate}deg)` : "none",
    }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: `linear-gradient(to right,transparent,${whoCol},transparent)`, opacity: isReq || inSlot || isMatch ? .9 : hovered ? .5 : .35 }} />
    {isMatch && <div style={{ position: "absolute", top: 2, right: 4, width: 6, height: 6, borderRadius: "50%", background: "#e8d44d", boxShadow: "0 0 8px #e8d44d", animation: "pulse 1s ease-in-out infinite" }} />}

    {/* ARCHETYPE CORE — shape (WHO bits) + texture (WHERE bits) + glow (WHEN bits) */}
    <div style={{
      width: 28, height: 28, flexShrink: 0, marginTop: 2, position: "relative",
      transition: `filter ${hover.dur}s, transform ${hover.dur}s`,
      filter: inSlot ? `drop-shadow(0 0 7px ${col}cc)` : archFilter,
      animation: inSlot ? "none" : `am-${arch.bin} ${g.spd}s ease-in-out infinite`,
    }}>
      {/* WHERE texture overlay */}
      <div style={{ position: "absolute", inset: 0, background: texture, clipPath, opacity: inSlot ? .9 : .6, transition: "opacity .2s" }} />
      {/* WHO shape color fill */}
      <div style={{ position: "absolute", inset: 0, background: col, clipPath, opacity: inSlot ? .55 : .4, boxShadow: inSlot || hovered ? archGlow : "none", filter: isGhost ? "blur(.5px)" : "none", transition: "all .2s" }} />
      {/* Ghost: mist halo */}
      {isGhost && <div style={{ position: "absolute", inset: -2, borderRadius: "50%", background: `radial-gradient(circle,${col}28,transparent 70%)`, animation: `pulse ${g.spd}s ease-in-out infinite` }} />}
      {/* Zero: inner void */}
      {isZero && <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: "#040302", opacity: .72 }} />}
      {/* binary micro-label */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6.5, color: "rgba(0,0,0,.4)", fontWeight: 700, fontFamily: "monospace", letterSpacing: -.5, clipPath }}>{arch.bin.slice(0, 3)}</div>
    </div>

    <div style={{ fontSize: 11, fontWeight: 700, color: inSlot ? col : isMatch ? "#f8e060" : isReq ? "#f0c860" : hovered ? col + "dd" : "#c89040", fontFamily: "Georgia,serif", textAlign: "center", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", padding: "0 2px", transition: "color .15s" }}>{arch.name}</div>
    <div style={{ fontSize: 9.5, color: inSlot ? col + "cc" : isMatch ? "#e8c040cc" : hovered ? col + "88" : "#7a5828", textAlign: "center", lineHeight: 1.1, width: "100%", padding: "0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{arch.key.split(",")[0]}</div>
    {(isReq || isMatch) && !inSlot && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isMatch ? "#e8d44d" : col, animation: "pulse 1.5s ease-in-out infinite", marginTop: 1 }} />}
  </div>);
});

// ── CONTEXT HINT ── (restored from V1)
function ContextHint({ hint, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 5000); return () => clearTimeout(t); }, []);
  return (<div style={{ position: "fixed", top: 90, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#1a1608,#0e0c04)", border: "1px solid #c8900a88", borderRadius: 14, padding: "10px 16px", zIndex: 599, animation: "slideDown .3s ease", maxWidth: "86vw", textAlign: "center", boxShadow: "0 0 24px #c8900a22", cursor: "pointer" }} onClick={onDone}>
    <div style={{ fontSize: 11, color: "#c8900a", letterSpacing: 2, fontFamily: "monospace", marginBottom: 4 }}>✦ МАЙСТЕР РАДИТЬ</div>
    <div style={{ fontSize: 12.5, color: "#e8c060", fontFamily: "Georgia,serif", fontStyle: "italic", lineHeight: 1.55 }}>{hint}</div>
    <div style={{ fontSize: 10, color: "#8a6030", marginTop: 5 }}>торкнись, щоб закрити</div>
  </div>);
}

// ── TUTORIAL ──
const TUT = [
  { sym: "⚗", title: "Три стовпи алхімії", body: "Кожен архетип має три виміри:\n\n🟢 ХТО — суб'єкт: Я, Ти, Ми, Вони\n🔵 ДЕ — простір: Північ, Південь, Схід, Захід\n🟡 КОЛИ — час: Зима, Весна, Літо, Осінь\n\nЇх комбінація народжує унікальну сутність.", demo: "pillars" },
  { sym: "⊕", title: "Алхімічна реакція", body: "Формула трансмутації:\n\n ПОЧАТОК ⊕ ІМПУЛЬС ⊕ КАТАЛІЗАТОР = РЕЗУЛЬТАТ\n\nОперація ⊕ (XOR) — бітове перетворення. Де біти різні — 1, де однакові — 0.", demo: "xor" },
  { sym: "🔑", title: "Ключові слова — твій компас", body: "Кожен архетип має ключові слова, що підказують роль:\n\n• Самота + Скорбота + Каяття → Тінь (Нігредо)\n• Пошук + Свідчення + Наставництво → Провидець\n\nЧитай ключові слова — і знаходь рецепт!", demo: "keys" },
];
function Tutorial({ onDone }) {
  const [step, setStep] = useState(0); const s = TUT[step]; const last = step === TUT.length - 1;
  const PillarsDemo = () => (<div style={{ display: "flex", gap: 6, marginTop: 12 }}>{[["ХТО", "ME", "145,60%,52%"], ["ДЕ", "EAST", "210,60%,52%"], ["КОЛИ", "SPRING", "35,70%,54%"]].map(([lb, v, h]) => (<div key={lb} style={{ flex: 1, background: `hsla(${h},.12)`, border: `1px solid hsl(${h})`, borderRadius: 10, padding: "8px 4px", textAlign: "center" }}><div style={{ fontSize: 11, color: "#c89048", letterSpacing: 1, marginBottom: 3 }}>{lb}</div><div style={{ width: 20, height: 20, borderRadius: "50%", background: `hsl(${h})`, margin: "0 auto 3px" }} /><div style={{ fontSize: 10, color: `hsl(${h})`, fontWeight: 700 }}>{v}</div></div>))}</div>);
  const XorDemo = () => { const a = "101100", b = "001010", r = xorBin(a, b); return (<div style={{ background: "#09060300", border: "1px solid #1c1208", borderRadius: 10, padding: "10px", marginTop: 12, fontFamily: "monospace", fontSize: 11 }}>{[[" A", a, "#6272a4"], ["⊕B", b, "#f07070"], ["= ", r, "#e8d44d"]].map(([lb, v, c]) => (<div key={lb} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ fontSize: 11.5, color: "#aa7030", width: 18 }}>{lb}</span><div style={{ display: "flex", gap: 2 }}>{v.split("").map((b2, i) => (<div key={i} style={{ width: 17, height: 17, borderRadius: 3, background: b2 === "1" ? `${c}28` : "transparent", border: `1px solid ${c}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: b2 === "1" ? c : "#8a5830" }}>{b2}</div>))}</div></div>))}<div style={{ marginTop: 5, fontSize: 10, color: "#c89040", textAlign: "center", fontFamily: "Georgia,serif", fontStyle: "italic" }}>→ {ga(r).name}</div></div>); };
  const KeysDemo = () => (<div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>{[["Solitary", "ізоляція", "#6272a4"], ["Mourner", "скорбота", "#7dcfff"], ["Penitent", "каяття", "#f07070"]].map(([n, k, c]) => (<div key={n} style={{ display: "flex", alignItems: "center", gap: 8, background: "#0a060300", border: "1px solid #1c1208", borderRadius: 8, padding: "6px 10px" }}><div style={{ width: 9, height: 9, borderRadius: "50%", background: c, flexShrink: 0 }} /><span style={{ fontFamily: "Georgia,serif", fontSize: 11, color: c, flex: 1 }}>{n}</span><span style={{ fontSize: 12, color: "#c08040", fontStyle: "italic" }}>{k}</span></div>))}<div style={{ textAlign: "center", fontSize: 11, color: "#b8870a", marginTop: 4, fontStyle: "italic", fontFamily: "Georgia,serif" }}>→ разом породжують Shadow (Нігредо)</div></div>);
  const demos = { pillars: <PillarsDemo />, xor: <XorDemo />, keys: <KeysDemo /> };
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(4,2,0,.94)", zIndex: 800, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div style={{ width: "100%", maxWidth: 480, background: "linear-gradient(160deg,#1c1408,#0e0b04)", borderRadius: "22px 22px 0 0", border: "1px solid #2e1e0a", borderBottom: "none", padding: "20px 18px 28px", animation: "parchIn .32s cubic-bezier(.32,.72,0,1)", maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ width: 36, height: 4, background: "#2e1e0a", borderRadius: 2, margin: "0 auto 14px" }} />
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>{TUT.map((_, i) => (<div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i <= step ? "#b8870a" : "#221608", transition: "all .3s", boxShadow: i === step ? "0 0 7px #b8870a" : "" }} />))}</div>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", margin: "0 auto 10px", background: "linear-gradient(135deg,#2e1e0a,#1a1005)", border: "1.5px solid #b8870a77", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 0 18px #b8870a33" }}>{s.sym}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#f0d060", fontFamily: "Georgia,serif" }}>{s.title}</div>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ fontSize: 14, color: "#e8c860", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "Georgia,serif" }}>{s.body}</div>
        {demos[s.demo]}
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 16, flexShrink: 0 }}>
        {step > 0 && <button onClick={() => setStep(step - 1)} style={{ flex: 1, background: "transparent", border: "1px solid #2e1e0a", color: "#e0a840", borderRadius: 11, padding: "13px", cursor: "pointer", fontSize: 13, fontFamily: "Georgia,serif" }}>← Назад</button>}
        <button onClick={() => last ? onDone() : setStep(step + 1)} style={{ flex: 2, background: last ? "linear-gradient(135deg,#b8870a,#8a6010)" : "#181208", border: `1px solid ${last ? "#b8870a" : "#2e1e0a"}`, color: last ? "#fff8e0" : "#e8c040", borderRadius: 11, padding: "14px", cursor: "pointer", fontSize: 14, fontFamily: "Georgia,serif", fontWeight: 700, boxShadow: last ? "0 0 18px #b8870a44" : "none" }}>{last ? "Почати Велике Діяння ⚗" : "Далі →"}</button>
      </div>
    </div>
  </div>);
}

// ── STAGE CONTEXT ──
function StageContext({ stage }) {
  return (<div style={{ background: `linear-gradient(135deg,${stage.bg},#0a0804)`, border: `1px solid ${stage.ac}33`, borderRadius: 13, padding: "10px 13px", marginBottom: 8, boxShadow: `inset 0 0 20px ${stage.ac}08` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ fontSize: 26, flexShrink: 0, filter: `drop-shadow(0 0 8px ${stage.ac})` }}>{stage.sym}</div>
      <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: stage.ac, letterSpacing: 2, fontFamily: "monospace", fontWeight: 700, marginBottom: 2 }}>{stage.name.toUpperCase()} · {stage.sub}</div><div style={{ fontSize: 12.5, color: "#d4a848", fontStyle: "italic", lineHeight: 1.55, fontFamily: "Georgia,serif" }}>{stage.desc}</div></div>
    </div>
    <div style={{ marginTop: 9, paddingTop: 8, borderTop: `1px solid ${stage.ac}22`, fontSize: 12, color: "#c89040", fontStyle: "italic", fontFamily: "Georgia,serif", display: "flex", gap: 6, alignItems: "flex-start" }}><span style={{ fontSize: 13, flexShrink: 0 }}>💡</span><span>{stage.hint}</span></div>
  </div>);
}

// ── INSPIRATION PANEL ──
function InspirationPanel({ ingredients, stage }) {
  if (ingredients.length !== 2) return null;
  const insp = getInspiration(ingredients[0], ingredients[1], stage.result); if (!insp) return null;
  const col = ac(insp.who, insp.where, insp.when); const whoCol = `hsl(${WHO_HUE[insp.who]},65%,52%)`;
  return (<div style={{ background: `linear-gradient(135deg,${col}14,#0c0a04)`, border: `1.5px solid ${col}55`, borderRadius: 12, padding: "11px 13px", marginBottom: 8, animation: "revealIn .3s ease", boxShadow: `0 0 20px ${col}18` }}>
    <div style={{ fontSize: 10, color: col, letterSpacing: 2, fontFamily: "monospace", fontWeight: 700, marginBottom: 8 }}>✦ НАТХНЕННЯ — ТРЕТІЙ ІНГРЕДІЄНТ</div>
    <div style={{ display: "flex", gap: 5, marginBottom: 9 }}>
      {[{ lbl: "ХТО", val: WHO_LABEL[insp.who] || insp.who, c: whoCol, desc: CLUE_WHO[insp.who] }, { lbl: "ДЕ", val: insp.where, c: `hsl(${WHO_HUE[insp.who]},${WHERE_SAT[insp.where]}%,60%)`, desc: CLUE_WHERE[insp.where] }, { lbl: "КОЛИ", val: insp.when, c: `hsl(${WHO_HUE[insp.who]},50%,${WHEN_LIT[insp.when] + 10}%)`, desc: CLUE_WHEN[insp.when] }].map(({ lbl, val, c, desc }) => (<div key={lbl} style={{ flex: 1, background: "#0e0c06", borderRadius: 9, padding: "7px 5px", border: `1px solid ${c}44`, textAlign: "center" }}><div style={{ fontSize: 10, color: c, fontWeight: 700, letterSpacing: 1, fontFamily: "monospace", marginBottom: 3 }}>{lbl}</div><div style={{ fontSize: 11, fontWeight: 700, color: c, fontFamily: "Georgia,serif", marginBottom: 4, lineHeight: 1.1 }}>{val}</div><div style={{ fontSize: 10, color: c + "99", lineHeight: 1.3, fontStyle: "italic" }}>{desc.split("—")[0].split(",")[0].trim()}</div></div>))}
    </div>
    <div style={{ fontSize: 11.5, color: "#c89040", fontStyle: "italic", fontFamily: "Georgia,serif", lineHeight: 1.55, padding: "7px 10px", background: "#0a0804", borderRadius: 8, border: `1px solid ${col}22` }}>🕯 «{insp.line3}»</div>
  </div>);
}

// ── LETTER TAB ──
function LetterTab({ stage }) {
  const letter = LETTERS[stage - 1];
  if (!letter) return <div style={{ color: "#6a4010", textAlign: "center", padding: 24, fontFamily: "Georgia,serif" }}>Лист ще не знайдено...</div>;
  return (<div>
    <div style={{ textAlign: "center", marginBottom: 16 }}><div style={{ fontSize: 42, marginBottom: 4, animation: "floatY 3s ease-in-out infinite" }}>{letter.seal}</div><div style={{ fontSize: 11, color: "#8a6030", letterSpacing: 2, fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>ЛИСТ АЛХІМІКА</div><div style={{ fontSize: 12, color: "#c89040", fontStyle: "italic" }}>{letter.from}</div><div style={{ width: 50, height: 1, background: "linear-gradient(to right,transparent,#c8900a66,transparent)", margin: "10px auto" }} /></div>
    <div style={{ fontSize: 13, lineHeight: 1.9, color: "#e0c060", fontFamily: "Georgia,serif", whiteSpace: "pre-wrap", marginBottom: 14, padding: "12px 14px", background: "#0c0a04", borderRadius: 11, border: "1px solid #2a1c08" }}>{letter.text}</div>
    <div style={{ padding: "10px 14px", background: "rgba(200,144,10,.08)", border: "1px solid #c8900a44", borderRadius: 10, display: "flex", gap: 8, alignItems: "flex-start" }}><span style={{ fontSize: 16, flexShrink: 0 }}>🕯</span><div style={{ fontSize: 12, color: "#c89040", lineHeight: 1.65, fontStyle: "italic" }}>{letter.clue}</div></div>
  </div>);
}

// ── GRIMOIRE ──
const Grimoire = React.memo(function Grimoire({ stage, gs, onClose }) {
  useEscClose(onClose);
  const s = STAGES[stage - 1]; const req = s.required.map(ga);
  const [tab, setTab] = useState("recipe");
  const masterHint = gs.stageFails >= 1 ? s.masterHints[Math.min(gs.stageFails - 1, s.masterHints.length - 1)] : null;
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(4,2,0,.86)", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "linear-gradient(160deg,#1e1608,#120e04)", borderRadius: "20px 20px 0 0", padding: "18px 16px 24px", animation: "parchIn .28s ease", fontFamily: "Georgia,serif", color: "#e8c060", maxHeight: "82vh", display: "flex", flexDirection: "column", border: "1px solid #c8900a33", borderBottom: "none", boxShadow: "0 -6px 30px rgba(0,0,0,.7)" }}>
      <div style={{ width: 34, height: 4, background: "#c8900a55", borderRadius: 2, margin: "0 auto 12px" }} />
      <div style={{ display: "flex", gap: 2, marginBottom: 12, borderBottom: "1px solid #c8900a44", paddingBottom: 8 }}>
        {[["recipe", "📜 Рецепт"], ["deduce", "🔍 Ключі"], ["letter", "✉ Лист"], ["lore", "📖 Лор"], ["hints", "💡 Майстер"]].map(([id, lb]) => (<button key={id} onClick={() => setTab(id)} style={{ flex: 1, background: tab === id ? "#c8900a" : "#1a1206", border: tab === id ? "none" : `1px solid #c8900a33`, borderRadius: 8, padding: "7px 2px", cursor: "pointer", fontSize: 10.5, color: tab === id ? "#fff8e0" : "#c89040", fontFamily: "Georgia,serif", fontWeight: tab === id ? 700 : 400, transition: "all .15s", lineHeight: 1.2 }}>{lb}</button>))}
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {tab === "recipe" && (<div>
          <div style={{ textAlign: "center", marginBottom: 14 }}><div style={{ fontSize: 38, animation: "floatY 3s ease-in-out infinite", filter: `drop-shadow(0 0 10px ${s.ac})` }}>{s.sym}</div><div style={{ fontSize: 18, fontWeight: 700, color: "#f0d060", marginTop: 4 }}>{s.name}</div><div style={{ fontSize: 10, color: "#c89040", fontStyle: "italic" }}>{s.sub}</div></div>
          <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: "#d4aa40", letterSpacing: 2, textTransform: "uppercase", marginBottom: 7, fontWeight: 600 }}>НЕОБХІДНІ АРХЕТИПИ</div>{req.map(a => { const c = ac(a.who, a.where, a.when); const have = gs.ingredients.some(i => i.bin === a.bin); return (<div key={a.bin} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5, padding: "8px 10px", background: have ? "rgba(255,200,60,.08)" : "rgba(255,255,255,.03)", borderRadius: 9, border: `1px solid ${have ? c + "88" : "#3a2810"}` }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: c, flexShrink: 0, boxShadow: have ? `0 0 8px ${c}` : "" }} />  <div style={{ flex: 1 }}><span style={{ fontWeight: 700, fontSize: 13, color: "#f0d060" }}>{a.name}</span><span style={{ fontSize: 12, color: "#c89040", marginLeft: 7, fontStyle: "italic" }}>{a.key}</span></div>{have && <span style={{ color: c, fontSize: 15, fontWeight: 700 }}>✓</span>}</div>); })}</div>
          <div style={{ padding: "9px 12px", background: "rgba(0,0,0,.06)", border: "1px solid #c4a06a", borderRadius: 9, fontSize: 11.5, color: "#b87838", fontStyle: "italic" }}>💡 {s.hint}</div>
        </div>)}
        {tab === "deduce" && (<div>
          <div style={{ fontSize: 11, color: "#c8900a", letterSpacing: 2, fontWeight: 600, marginBottom: 14, textTransform: "uppercase" }}>🔍 ДЕДУКТИВНІ КЛЮЧІ</div>
          {req.map((a, i) => {
            const c = ac(a.who, a.where, a.when); const have = gs.ingredients.some(ing => ing.bin === a.bin); return (<div key={a.bin} style={{ marginBottom: 12, padding: "12px", background: have ? "rgba(200,144,10,.1)" : "#0e0c06", borderRadius: 12, border: `1px solid ${have ? c + "88" : "#2a1c08"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>{have ? <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, flexShrink: 0, boxShadow: `0 0 8px ${c}` }} /> : <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #3a2810", flexShrink: 0 }} />}<div style={{ fontSize: 12, color: have ? c : "#c89040", fontWeight: 700 }}>{CLUE_NUM[i]}</div>{have && <div style={{ fontSize: 11, color: c, marginLeft: "auto" }}>✓ {a.name}</div>}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 12, color: "#d4a040", lineHeight: 1.5 }}><span style={{ color: "#8a6030", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>ХТО: </span>{CLUE_WHO[a.who]}</div>
                <div style={{ fontSize: 12, color: "#d4a040", lineHeight: 1.5 }}><span style={{ color: "#8a6030", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>ДЕ: </span>{CLUE_WHERE[a.where]}</div>
                <div style={{ fontSize: 12, color: "#d4a040", lineHeight: 1.5 }}><span style={{ color: "#8a6030", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>КОЛИ: </span>{CLUE_WHEN[a.when]}</div>
              </div>
            </div>);
          })}
        </div>)}
        {tab === "letter" && <LetterTab stage={stage} />}
        {tab === "lore" && (<div><div style={{ fontSize: 32, textAlign: "center", marginBottom: 10, animation: "floatY 3s ease-in-out infinite" }}>{s.sym}</div><div style={{ fontSize: 14, lineHeight: 1.85, color: "#e8c060", fontStyle: "italic", marginBottom: 10 }}>{s.desc}</div></div>)}
        {tab === "hints" && (<div>{masterHint ? (<div style={{ background: "#1a1206", borderRadius: 10, padding: "14px", border: "1px solid #c8900a44" }}><div style={{ fontSize: 11, color: "#e8a820", letterSpacing: 2, marginBottom: 7, fontWeight: 600 }}>МАЙСТЕР ШЕПОЧЕ</div><div style={{ fontSize: 14, color: "#e8c060", lineHeight: 1.75, fontStyle: "italic" }}>{masterHint}</div></div>) : (<div style={{ textAlign: "center", padding: "24px 0", color: "#a07830", fontSize: 13, fontStyle: "italic" }}>Майстер мовчить...</div>)}</div>)}
      </div>
    </div>
  </div>);
});

// ── ACH PANEL ──
function AchPanel({ gs, onClose }) {
  useEscClose(onClose);
  const earned = Object.values(ACH).filter(a => a.fn(gs));
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(4,2,0,.88)", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "linear-gradient(160deg,#1e1608,#120e04)", borderRadius: "20px 20px 0 0", border: "1px solid #c8900a33", borderBottom: "none", padding: "18px 14px 24px", animation: "parchIn .28s ease", maxHeight: "74vh", display: "flex", flexDirection: "column" }}>
      <div style={{ width: 34, height: 4, background: "#1e1408", borderRadius: 2, margin: "0 auto 12px" }} />
      <div style={{ fontSize: 12, color: "#b8870a", letterSpacing: 3, textAlign: "center", marginBottom: 3, fontFamily: "Georgia,serif" }}>🏆 ДОСЯГНЕННЯ</div>
      <div style={{ fontSize: 12, color: "#d4a050", textAlign: "center", marginBottom: 10 }}>{earned.length}/{Object.keys(ACH).length} отримано</div>
      <div style={{ height: 3, background: "#1a1005", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}><div style={{ width: `${earned.length / Object.keys(ACH).length * 100}%`, height: "100%", background: "linear-gradient(to right,#b8870a,#e8c050)", borderRadius: 2, transition: "width .5s" }} /></div>
      <div style={{ overflowY: "auto", flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {Object.values(ACH).map(a => { const got = a.fn(gs); return (<div key={a.icon} style={{ padding: "10px", borderRadius: 12, background: got ? "#1e1608" : "#0e0c04", border: `1px solid ${got ? "#c8900a55" : "#2a1c08"}`, opacity: got ? 1 : .38, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textAlign: "center" }}><div style={{ fontSize: 22, filter: got ? "none" : "grayscale(1)" }}>{a.icon}</div><div style={{ fontSize: 11, fontWeight: 600, color: got ? "#b8870a" : "#8a5830", fontFamily: "Georgia,serif", lineHeight: 1.1 }}>{a.title}</div><div style={{ fontSize: 11.5, color: "#d4a050", lineHeight: 1.3 }}>{a.desc}</div></div>); })}
      </div>
    </div>
  </div>);
}

// ── RECOVERY PANEL ──
function RecoveryPanel({ gs, onAction, onClose }) {
  useEscClose(onClose);
  const [flash, setFlash] = useState(null);
  const doAction = (r) => {
    if (!r.can(gs)) return; const before = { ...gs.resources }; const next = r.apply(gs);
    const lines = []; if (next.purity !== gs.purity) lines.push(`${next.purity > gs.purity ? "+" : ""}${Math.round(next.purity - gs.purity)} Чистоти`);
    Object.entries(next.resources).forEach(([k, v]) => { const d = v - before[k]; if (d !== 0) lines.push(`${d > 0 ? "+" : ""}${d} ${{ mercury: "☿", sulfur: "🔥", salt: "🧂", azoth: "💧" }[k]}`); });
    setFlash({ icon: r.icon, name: r.name, col: r.col, lines }); SFX.recover(); onAction(next); setTimeout(() => setFlash(null), 2200);
  };
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(4,2,0,.9)", zIndex: 410, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "linear-gradient(160deg,#1e1608,#120e04)", borderRadius: "22px 22px 0 0", border: "1px solid #c8900a33", borderBottom: "none", padding: "18px 14px 28px", animation: "sheetIn .3s cubic-bezier(.32,.72,0,1)", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 -12px 60px rgba(0,0,0,.8)" }}>
      <div style={{ width: 34, height: 4, background: "#221808", borderRadius: 2, margin: "0 auto 14px" }} />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div><div style={{ fontSize: 11.5, color: "#b87838", letterSpacing: 3, textTransform: "uppercase", marginBottom: 1 }}>ЛАБОРАТОРНИЙ СТІЛ</div><div style={{ fontSize: 16, fontWeight: 700, color: "#e8c050", fontFamily: "Georgia,serif" }}>Відновлення ресурсів</div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "#d4a050", letterSpacing: 1 }}>Чистота</div><div style={{ fontSize: 14, fontWeight: 700, color: "#e8c040", fontFamily: "monospace" }}>✦{gs.purity}%</div></div>
      </div>
      {flash && (<div style={{ marginBottom: 10, background: `${flash.col}14`, border: `1px solid ${flash.col}44`, borderRadius: 12, padding: "9px 12px", animation: "revealIn .25s ease", textAlign: "center" }}><div style={{ fontSize: 18, marginBottom: 2 }}>{flash.icon}</div><div style={{ fontSize: 11, fontWeight: 700, color: flash.col, fontFamily: "Georgia,serif", marginBottom: 5 }}>{flash.name}</div><div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>{flash.lines.map((l, i) => <span key={i} style={{ fontSize: 11.5, fontFamily: "monospace", fontWeight: 700, color: l[0] === "+" ? "#4ade80" : "#f07070" }}>{l}</span>)}</div></div>)}
      <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        {RECOVERY.map(r => {
          const can = r.can(gs); const used = gs.recov[r.id] || 0; const left = r.limit - (typeof gs.recov[r.id] === "boolean" ? (gs.recov[r.id] ? 1 : 0) : used); return (<div key={r.id} style={{ background: can ? `linear-gradient(135deg,${r.col}0c,#0c0a03)` : "#090703", border: `1px solid ${can ? r.col + "33" : "#5a3820"}`, borderRadius: 13, padding: "12px", opacity: can ? 1 : .42 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ fontSize: 24, flexShrink: 0, lineHeight: 1, filter: can ? "none" : "grayscale(1)" }}>{r.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}><div style={{ fontSize: 12.5, fontWeight: 700, color: can ? r.col : "#8a5830", fontFamily: "Georgia,serif" }}>{r.name}</div><div style={{ fontSize: 11, color: left > 0 ? "#aa7030" : "#c04040", background: left > 0 ? "#1e1408" : "#1e0808", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>{left > 0 ? `ще ${left}×` : "вичерпано"}</div></div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: can ? 10 : 0 }}>
                  <div style={{ background: "#1a0e04", borderRadius: 5, padding: "2px 7px" }}><span style={{ fontSize: 11.5, color: "#e05050" }}>витрата: </span><span style={{ fontSize: 11.5, color: "#d4a058", fontFamily: "monospace" }}>{r.cost}</span></div>
                  <div style={{ background: "#031a0a", borderRadius: 5, padding: "2px 7px" }}><span style={{ fontSize: 11.5, color: "#40c060" }}>отримуєш: </span><span style={{ fontSize: 11.5, color: "#60a070", fontFamily: "monospace" }}>{r.gain}</span></div>
                </div>
                {can && <button onClick={() => doAction(r)} style={{ width: "100%", background: `linear-gradient(135deg,${r.col}22,${r.col}0c)`, border: `1px solid ${r.col}44`, borderRadius: 9, padding: "8px", cursor: "pointer", fontSize: 12.5, color: r.col, fontFamily: "Georgia,serif", boxShadow: `0 0 14px ${r.col}14` }}>Виконати</button>}
              </div>
            </div>
          </div>);
        })}
      </div>
    </div>
  </div>);
}

// ── RESULT MODAL ──
function ResultModal({ success, stageIdx, resultBin, failInfo, resonanceLabel, onNext, onRetry }) {
  const s = STAGES[stageIdx - 1]; const r = ga(resultBin); const rc = ac(r.who, r.where, r.when);
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(2,1,0,.95)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div style={{ background: `linear-gradient(155deg,${success ? s.bg : "#120606"},#060301)`, border: `2px solid ${success ? s.ac : "#8b1818"}`, borderRadius: 22, padding: "26px 20px", maxWidth: 340, width: "100%", textAlign: "center", boxShadow: `0 0 60px ${success ? s.ac + "44" : "#8b181844"}`, animation: "slideUp .32s cubic-bezier(.32,.72,0,1)" }}>
      <div style={{ fontSize: 58, marginBottom: 10, animation: success ? "floatR 3s ease-in-out infinite" : "none", filter: success ? `drop-shadow(0 0 16px ${s.ac})` : "none" }}>{success ? s.sym : "💀"}</div>
      <div style={{ fontSize: 11.5, color: success ? s.ac : "#b03030", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>{success ? "✦ Трансмутація успішна" : "Реакція провалена"}</div>
      {success ? (<>
        <div style={{ fontSize: 19, fontWeight: 700, color: "#e8c050", fontFamily: "Georgia,serif", marginBottom: 4 }}>{s.name}</div>
        <div style={{ fontSize: 11, color: "#d4a050", fontStyle: "italic", lineHeight: 1.65, marginBottom: 14, fontFamily: "Georgia,serif" }}>{s.desc}</div>
        {resonanceLabel && <div style={{ background: "#1a1600", border: "1px solid #b8870a44", borderRadius: 9, padding: "6px 10px", marginBottom: 10, fontSize: 10, color: "#d4a020", textAlign: "center" }}>🎵 {resonanceLabel}</div>}
        <div style={{ background: `${rc}10`, border: `1px solid ${rc}40`, borderRadius: 13, padding: "11px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#c08040", letterSpacing: 2, marginBottom: 7 }}>ОТРИМАНИЙ АРХЕТИП</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}><div style={{ width: 34, height: 34, borderRadius: "50%", background: rc, boxShadow: `0 0 16px ${rc}`, animation: "floatY 2.5s ease-in-out infinite", flexShrink: 0 }} /><div style={{ textAlign: "left" }}><div style={{ fontSize: 18, fontWeight: 700, color: rc, fontFamily: "Georgia,serif", lineHeight: 1 }}>{r.name}</div><div style={{ fontSize: 12, color: "#c08040", fontStyle: "italic", marginTop: 2 }}>{r.key}</div></div></div>
        </div>
        <button onClick={onNext} style={{ background: `linear-gradient(135deg,${s.ac},${s.ac}99)`, border: "none", color: "#040200", borderRadius: 12, padding: "13px 28px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "Georgia,serif", boxShadow: `0 0 20px ${s.ac}55` }}>{stageIdx >= 10 ? "☯ Завершити" : "Далі →"}</button>
      </>) : (<>
        {failInfo && <div style={{ textAlign: "left", marginBottom: 12 }}>
          <div style={{ background: failInfo.ingOk ? "#0a1a0a" : "#1a0a0a", border: `1px solid ${failInfo.ingOk ? "#2a6030" : "#7a1818"}`, borderRadius: 10, padding: "8px 11px", marginBottom: 6, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{failInfo.ingOk ? "✅" : "❌"}</span>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: failInfo.ingOk ? "#4ade80" : "#e05050", fontFamily: "monospace", marginBottom: 2 }}>АРХЕТИПИ</div><div style={{ fontSize: 11, color: failInfo.ingOk ? "#60a070" : "#c06060", fontStyle: "italic", lineHeight: 1.4 }}>{failInfo.ingOk ? "Вірна комбінація" : "Не резонує з поточною стадією. Відкрий Грімуар → Ключі."}</div></div>
          </div>
          <div style={{ background: failInfo.heatOk ? "#0a1a0a" : "#1a0e00", border: `1px solid ${failInfo.heatOk ? "#2a6030" : "#986000"}`, borderRadius: 10, padding: "8px 11px", marginBottom: 6, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{failInfo.heatOk ? "✅" : "🌡"}</span>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: failInfo.heatOk ? "#4ade80" : "#e0a040", fontFamily: "monospace", marginBottom: 2 }}>ТЕМПЕРАТУРА</div><div style={{ fontSize: 11, color: failInfo.heatOk ? "#60a070" : "#c09040", fontStyle: "italic", lineHeight: 1.4 }}>{failInfo.heatOk ? "В нормі" : `Потрібно ${failInfo.heatMin}°–${failInfo.heatMax}°. Відрегулюй Атанор.`}</div></div>
          </div>
          {failInfo.resShort && <div style={{ background: "#140a00", border: "1px solid #7a4010", borderRadius: 10, padding: "8px 11px", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚗</span>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: "#e08040", fontFamily: "monospace", marginBottom: 2 }}>РЕСУРСИ</div>
              <div style={{ fontSize: 11, color: "#c07030", fontStyle: "italic", lineHeight: 1.4 }}>
                Не вистачає: {[failInfo.resShort.mercury && "☿ Ртуть", failInfo.resShort.sulfur && "🔥 Сірка", failInfo.resShort.salt && "🧂 Сіль", failInfo.resShort.azoth && "💧 Азот"].filter(Boolean).join(", ")}. Відвідай Лабораторний стіл.
              </div></div>
          </div>}
        </div>}
        <div style={{ fontSize: 12, color: "#c89040", lineHeight: 1.65, marginBottom: 16, fontFamily: "Georgia,serif", fontStyle: "italic", padding: "8px 10px", background: "#0e0c06", borderRadius: 9, border: "1px solid #2a1c08" }}>«Невдача — найкращий вчитель алхіміка»</div>
        <button onClick={onRetry} style={{ background: "transparent", border: "1px solid #3e2210", color: "#d4a050", borderRadius: 11, padding: "11px 24px", cursor: "pointer", fontSize: 13, fontFamily: "Georgia,serif" }}>Спробувати знову</button>
      </>)}
    </div>
  </div>);
}

// ── TRANS ANIM ──
function TransAnim({ color, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, []);
  const rays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  return (<div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle,${color}2a,transparent 62%)`, animation: "fadeIn .4s ease" }} />
    {/* Rays */}
    {rays.map((angle, i) => (<div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: 200, height: 2, borderRadius: 1, background: `linear-gradient(to right,${color}cc,transparent)`, transformOrigin: "0% 50%", "--angle": `${angle}deg`, animation: `rayOut .9s ease-out ${i * .04 + 0.1}s forwards`, opacity: 0 }} />))}
    {[80, 140, 200, 260].map((r, i) => (<div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: r * 2, height: r * 2, borderRadius: "50%", border: `${i === 0 ? 2 : 1}px solid ${color}${i === 0 ? "c8" : "55"}`, animation: `ringOut ${.65 + i * .22}s ease-out ${i * .1}s forwards` }} />))}
    <div style={{ fontSize: 52, animation: "burstStar 2.4s ease forwards", filter: `drop-shadow(0 0 22px ${color})`, zIndex: 1 }}>✦</div>
  </div>);
}

// ── TOAST ──
function Toast({ inc, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  const pos = Object.values(inc.fx || {}).some(v => v > 0);
  return (<div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: pos ? "#0e1e0e" : "#1e0c0c", border: `1px solid ${pos ? "#27ae60" : "#c0392b"}`, borderRadius: 14, padding: "9px 14px", zIndex: 600, animation: "slideUp .28s ease", maxWidth: "88vw", textAlign: "center", boxShadow: "0 6px 24px rgba(0,0,0,.75)" }}>
    <div style={{ fontSize: 20, marginBottom: 2 }}>{inc.icon}</div>
    <div style={{ fontSize: 12, fontWeight: 700, color: pos ? "#2ecc71" : "#e74c3c", marginBottom: 2, fontFamily: "Georgia,serif" }}>{inc.name}</div>
    <div style={{ fontSize: 10.5, color: "#d4a050", lineHeight: 1.4 }}>{inc.msg}</div>
  </div>);
}

// ── ACH POP ──
function AchPop({ ach, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  return (<div style={{ position: "fixed", top: 78, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#181200,#0d0a03)", border: "1.5px solid #b8870a", borderRadius: 14, padding: "10px 18px", zIndex: 600, animation: "slideDown .28s ease", textAlign: "center", boxShadow: "0 0 28px #b8870a44" }}>
    <div style={{ fontSize: 10.5, color: "#b8870a", letterSpacing: 3, marginBottom: 2 }}>✦ ДОСЯГНЕННЯ</div>
    <div style={{ fontSize: 22, marginBottom: 2 }}>{ach.icon}</div>
    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#b8870a", fontFamily: "Georgia,serif" }}>{ach.title}</div>
    <div style={{ fontSize: 12, color: "#b87838", marginTop: 1 }}>{ach.desc}</div>
  </div>);
}

// ── INTRO ──
const INTRO_TEXT = "Ви — останній учень згаслої алхімічної школи.\n\nВаш вчитель перед смертю передав вам таємний манускрипт. В ньому — шлях до Великого Діяння і безсмертя.\n\n«Пам'ятай, — прошепотів він, — справжня алхімія відбувається не в ретортах, а в душі алхіміка.»\n\nПопереду — десять стадій Magnum Opus.";
function IntroScreen({ onStart, onSkipTutorial, onOpenAcademy }) {
  const [done, setDone] = useState(false);
  return (<div style={{ position: "fixed", inset: 0, background: "#060401", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn 1s ease" }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, #c8900a0a 0%, transparent 65%)", pointerEvents: "none" }} />
    <button onClick={onOpenAcademy} aria-label="Академія алхіміків" style={{ position: "absolute", top: 14, right: 14, background: "#0c0903", border: "1px solid #7dcfff33", borderRadius: 8, color: "#7dcfff", padding: "6px 9px", cursor: "pointer", fontSize: 13, zIndex: 10 }}>🏛</button>
    <div style={{ maxWidth: 400, width: "100%", padding: "30px 24px", background: "linear-gradient(160deg,#1a1406,#0f0c04)", borderRadius: 22, border: "1.5px solid #c8900a55", boxShadow: "0 0 80px #c8900a22" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 52, animation: "floatR 4s ease-in-out infinite", filter: "drop-shadow(0 0 20px #c8900aaa)", lineHeight: 1, marginBottom: 10 }}>⚗</div>
        <div style={{ fontSize: 11, letterSpacing: 7, color: "#c89040", fontFamily: "monospace", fontWeight: 600, marginBottom: 4 }}>MAGNUM OPUS</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f0d060", fontFamily: "Georgia,serif", letterSpacing: .5 }}>Алхімічна Гра</div>
        <div style={{ width: 60, height: 1, background: "linear-gradient(to right,transparent,#c8900a,transparent)", margin: "10px auto 0" }} />
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.9, color: "#e0c070", fontFamily: "Georgia,serif", marginBottom: 22, minHeight: 185 }}>
        <Typewriter text={INTRO_TEXT} speed={18} onDone={() => setDone(true)} />
      </div>
      {done && (<div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "slideUp .35s ease" }}>
        <button onClick={onStart} style={{ width: "100%", background: "linear-gradient(135deg,#c8900a,#a06808)", border: "none", borderRadius: 13, padding: "15px", color: "#fff8e0", fontSize: 15, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 28px #c8900a66" }}>РОЗПОЧАТИ ВЕЛИКЕ ДІЯННЯ ⚗</button>
        <button onClick={onSkipTutorial} style={{ background: "transparent", border: "1px solid #c8900a55", borderRadius: 11, padding: "11px", color: "#c89040", fontSize: 13, fontFamily: "Georgia,serif", cursor: "pointer" }}>Пропустити навчання</button>
      </div>)}
      {!done && <div style={{ textAlign: "center", fontSize: 13, color: "#c89040", opacity: .5, animation: "pulse 1.5s ease-in-out infinite" }}>…</div>}
    </div>
  </div>);
}

// ── VICTORY ──
function VictoryScreen({ gs, onRestart, onNewGamePlus, onOpenAcademy }) {
  const totalAch = Object.keys(ACH).length;
  return (<div style={{ position: "fixed", inset: 0, background: "#020100", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, animation: "fadeIn 1.5s ease", backgroundImage: "radial-gradient(ellipse at 50% 35%,#281a00,transparent 55%)" }}>
    <button onClick={onOpenAcademy} aria-label="Академія алхіміків" style={{ position: "absolute", top: 14, right: 14, background: "#0c0903", border: "1px solid #7dcfff33", borderRadius: 8, color: "#7dcfff", padding: "6px 9px", cursor: "pointer", fontSize: 13, zIndex: 10 }}>🏛</button>
    {[120, 200, 285].map((r, i) => (<div key={i} style={{ position: "absolute", width: r * 2, height: r * 2, borderRadius: "50%", border: `1px solid #f8b500${["22", "14", "09"][i]}`, animation: `floatR ${6 + i * 2}s ease-in-out ${i}s infinite` }} />))}
    <div style={{ fontSize: 74, animation: "victorySpin 4s ease-in-out infinite", filter: "drop-shadow(0 0 36px #f8b500)", marginBottom: 8, zIndex: 1 }}>∞</div>
    <div style={{ fontSize: 12, color: "#f8b500", letterSpacing: 7, marginBottom: 6, zIndex: 1 }}>MAGNUM OPUS</div>
    <div style={{ fontSize: 25, fontWeight: 700, color: "#e8c050", fontFamily: "Georgia,serif", marginBottom: 5, textAlign: "center", zIndex: 1 }}>Ти досяг безсмертя</div>
    <div style={{ fontSize: 12.5, color: "#6a5028", fontStyle: "italic", marginBottom: 22, textAlign: "center", maxWidth: 290, lineHeight: 1.72, fontFamily: "Georgia,serif", zIndex: 1 }}>«Ти більше не людина. Ти — архетип. Твоє ім'я вписане в тканину всесвіту.»</div>
    <div style={{ display: "flex", gap: 20, marginBottom: 22, zIndex: 1 }}>
      {[["✦", "Чистота", `${gs.purity}%`], ["⚗", "Спроби", gs.experiments], ["🏆", "Досягнення", `${gs.earned.length}/${totalAch}`]].map(([ic, lb, v]) => (<div key={lb} style={{ textAlign: "center" }}><div style={{ fontSize: 20, marginBottom: 1 }}>{ic}</div><div style={{ fontSize: 22, fontWeight: 700, color: "#f8b500", fontFamily: "monospace" }}>{v}</div><div style={{ fontSize: 11, color: "#d4a050", letterSpacing: 1, marginTop: 1 }}>{lb.toUpperCase()}</div></div>))}
    </div>
    <div style={{ display: "flex", gap: 10, zIndex: 1, flexDirection: "column", alignItems: "center" }}>
      <button onClick={onNewGamePlus} style={{ background: "linear-gradient(135deg,#e8c040,#a87020)", border: "none", borderRadius: 13, padding: "13px 28px", color: "#040200", fontSize: 14, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer", boxShadow: "0 0 30px #e8c04066", letterSpacing: .5 }}>
        ✦ New Game+ <span style={{ fontSize: 11, opacity: .7, marginLeft: 4 }}>(складніше)</span>
      </button>
      <button onClick={onRestart} style={{ background: "transparent", border: "1px solid #c8900a55", borderRadius: 11, padding: "10px 24px", color: "#c89040", fontSize: 13, fontFamily: "Georgia,serif", cursor: "pointer" }}>Почати знову</button>
    </div>
    <div style={{ position: "absolute", bottom: 18, fontSize: 10, color: "#3a2808", fontFamily: "monospace", zIndex: 1, letterSpacing: 1 }}>
      {gs.earned.length >= totalAch ? "✦ ВСІ ДОСЯГНЕННЯ ОТРИМАНО ✦" : `${totalAch - gs.earned.length} досягнень ще не розкрито`}
    </div>
  </div>);
}

// ── NARRATIVE MODAL ──
function NarrativeModal({ stageIdx, onContinue }) {
  const [done, setDone] = useState(false); const n = NARRATIVES[stageIdx - 1];
  const nextS = STAGES[Math.min(stageIdx, TOTAL_STAGES - 1)];
  if (!n) return null;
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(1,0,0,.97)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
    <div style={{ maxWidth: 340, width: "100%", padding: "26px 20px", background: `linear-gradient(155deg,${nextS.bg},#040200)`, borderRadius: 22, textAlign: "center", border: `1px solid ${nextS.ac}33`, boxShadow: `0 0 70px ${nextS.ac}18`, animation: "slideUp .4s cubic-bezier(.32,.72,0,1)" }}>
      <div style={{ fontSize: 50, marginBottom: 7, animation: "floatR 4s ease-in-out infinite", filter: `drop-shadow(0 0 18px ${nextS.ac})` }}>{n.sym}</div>
      <div style={{ fontSize: 11, color: nextS.ac, letterSpacing: 3, textTransform: "uppercase", marginBottom: 5, fontWeight: 600 }}>{n.sub}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#e8c050", fontFamily: "Georgia,serif", marginBottom: 11 }}>{n.title}</div>
      <div style={{ width: 36, height: 1, background: `linear-gradient(to right,transparent,${nextS.ac}77,transparent)`, margin: "0 auto 13px" }} />
      <div style={{ fontSize: 12.5, lineHeight: 1.82, color: "#b09050", fontFamily: "Georgia,serif", marginBottom: 13, minHeight: 65, whiteSpace: "pre-wrap" }}><Typewriter text={n.text} speed={24} onDone={() => setDone(true)} /></div>
      <div style={{ fontSize: 10.5, fontStyle: "italic", color: nextS.ac + "88", fontFamily: "Georgia,serif", marginBottom: 18, padding: "7px 11px", background: `${nextS.ac}07`, borderRadius: 9, border: `1px solid ${nextS.ac}18` }}>{n.quote}</div>
      {done && <button onClick={onContinue} style={{ background: `linear-gradient(135deg,${nextS.ac},${nextS.ac}99)`, border: "none", color: "#030100", borderRadius: 12, padding: "12px 30px", cursor: "pointer", fontSize: 13.5, fontWeight: 700, fontFamily: "Georgia,serif", animation: "slideUp .3s ease" }}>Далі →</button>}
      {!done && <div style={{ fontSize: 12, color: nextS.ac + "33", animation: "pulse 1.5s ease-in-out infinite" }}>…</div>}
    </div>
  </div>);
}

// ── ARCH LORE & QUALITIES ──
const ARCH_LORE = {
  "000000": "Zero — порожнеча до всіх імен. Не відсутність, а джерело, з якого виникає будь-яке буття. Алхіміки називали це «prima materia» — першою речовиною, яка ще не визначилась.",
  "000001": "Omen — те невловиме відчуття перед подією. Не він спричиняє — він лише є попередженням, що тінь вже впала на шлях, ще до того, як нога ступила.",
  "000010": "Herald — перший подих змін. Несе звістку не словами, а самою своєю появою: все, що прийде після нього, вже незворотнє.",
  "000011": "Tribunal — холодна справедливість без обличчя. Він судить не з гніву, а з необхідності. Його вирок — це сама реальність.",
  "000100": "Specter — пам'ять, що відмовляється вмирати. Живе між тим, що було, і тим, що забули. Його присутність — відлуння незавершеного.",
  "000101": "Relic — те, що залишилось після того, як зникло все інше. Не артефакт, а сам час, що затвердів у формі.",
  "000110": "Wanderer — той, хто не шукає місця. Його мандрівка є сенсом, а не засобом. Кожен горизонт — не ціль, а новий початок.",
  "000111": "Legend — те, що перевищує будь-який окремий факт. Народжений у пам'яті колективу, він живе довше за всіх, хто його створив.",
  "001000": "Harbinger — він уже наближається, коли ти ще не чуєш кроків. Не загроза і не порятунок — лише невідворотне наближення того, що має статись.",
  "001001": "Stranger — той, хто приходить ззовні і несе з собою питання, яких не задають свої. Його чужість — це дзеркало для господарів місця.",
  "001010": "Ghost — імпульс без тіла. Він не живе у твоєму світі, але саме він примушує тебе зробити перший крок. Невидима рука, що відчиняє двері.",
  "001011": "Envoy — несе послання між світами, не розуміючи його змісту. Сам зміст не важливий — важливий акт передачі.",
  "001100": "Exile — він не пішов, його вигнали. Але з того дня, коли двері зачинились, він почав розуміти, що сховане за ними насправді.",
  "001101": "Shadow — не тьма, а форма, яку відкидає світло. Він є скрізь, де є яскравість, але ніхто не дивиться туди, де він живе.",
  "001110": "Arrival — не повернення, а прихід. Той, хто повертається, вже не той, хто пішов. Місце теж змінилось. Зустріч двох чужинців.",
  "001111": "Multitude — не натовп, а безліч окремих голосів, що ненадовго звучать в унісон. Їхня сила — не в єдності, а в кількості.",
  "010000": "Hermit — самота як вибір, а не покарання. Він замовк, щоб нарешті почути те, що говорить тиша між думками.",
  "010001": "Beloved — той, кому довіряють найбільше. Не через силу, а через те, що поруч з ним стає менш страшно бути собою.",
  "010010": "Guide — він знає шлях не тому, що пройшов його раніше, а тому, що вміє читати знаки, які інші не бачать.",
  "010011": "Oracle — говорить про майбутнє, яке вже відбулось у незримому. Слова його незрозумілі зараз, але стають очевидними пізніше.",
  "010100": "Keeper — охороняє не з наказу, а з розуміння цінності того, що легко загубити. Його пильність — форма любові.",
  "010101": "Confessor — вміє слухати так, що слова самі приходять. Прийняти чужу темряву без осуду — ось його справжній дар.",
  "010110": "Archivist — перетворює досвід на знання, знання — на пам'ять. Без нього все минуле розчинилось би без сліду.",
  "010111": "Elder — не просто старий. Той, чий вік перетворився на мудрість, бо кожна рана стала уроком, а не гіркотою.",
  "011000": "Seeker — запитання є його природою. Не тривога, не сумнів — чиста спрага розуміння того, що ховається за наступним горизонтом.",
  "011001": "Witness — бачить і пам'ятає. Не судить — просто фіксує. Але саме його пам'ять є тим судом, якого не уникнути.",
  "011010": "Teacher — знає, що найкраще навчання відбувається не через передачу знань, а через створення умов для власного відкриття.",
  "011011": "Visionary — бачить не те, що є, а те, що може стати. Його образи — не фантазії, а плани майбутнього, написані символами.",
  "011100": "Sentinel — стоїть на межі між двома світами. Не воїн — сторож. Його сила в тому, що він не рухається з місця.",
  "011101": "Mediator — знає мову обох сторін і каже не те, що думає сам, а те, що допоможе їм почути одне одного.",
  "011110": "Liberator — ламає кайдани, навіть коли ув'язнені не просять. Знає, що клітка стає частиною людини, якщо вона там довго.",
  "011111": "Sage — мудрість без зарозумілості. Його знання — не зброя і не привілей. Просто стан, в якому він перебуває.",
  "100000": "Solitary — обрав самоту не через зневагу до світу, а щоб почути власний голос крізь шум чужих голосів. Його тінь — дзеркало, в яке бояться дивитись.",
  "100001": "Mourner — горює не через слабкість, а тому що любив. Скорбота є мірою того, що мало значення. Він знає це краще за всіх.",
  "100010": "Survivor — не переміг, але вистояв. Різниця значна: перемога — про ворога, а виживання — про себе самого.",
  "100011": "Sovereign — його авторитет не потребує демонстрації. Він просто є тим, ким є, і цього достатньо, щоб простір навколо змінився.",
  "100100": "Penitent — каяття без приниження. Визнає провину не для того, щоб отримати прощення, а щоб стати чистішим.",
  "100101": "Drifter — не загублений, а вільний. Відсутність напрямку — це теж напрямок, якщо йти з відкритим серцем.",
  "100110": "Awakened — той, хто прокинувся посеред сну, який всі інші вважають реальністю. Тепер він не може вдати, що не бачить.",
  "100111": "Alchemist — трансформує не золото, а себе. Його лабораторія — власна душа. Кожна невдача — необхідний крок у Великому Ділянні.",
  "101000": "Dormant — потенціал, що ще не знайшов форми. Він дрімає не через слабкість, а тому що час ще не прийшов. Але він прийде.",
  "101001": "Outcast — відкинутий, але не зламаний. З краю видно те, чого не помітиш з центру. Його відторгнення — особлива форма свободи.",
  "101010": "Pioneer — перший крок у невідоме є і страхом, і радістю. Він не знає, що попереду. Але йде, і цього достатньо.",
  "101011": "Catalyst — сам не змінюється, але все навколо нього трансформується. Його присутність — дозвіл для інших стати тим, чим вони є.",
  "101100": "Steadfast — не рухається, коли всі рухаються. Не тому що боїться — тому що знає, де його місце. Витривалість — його форма мужності.",
  "101101": "Recluse — відступив, але не здався. Тиша його — не поразка, а збереження сил для того, що справді важливо.",
  "101110": "Transformer — метаморфоза завжди болісна. Він знає це краще за всіх — і все одно проходить крізь неї знову і знову.",
  "101111": "Fulfilled — не досяг досконалості, але прийняв себе цілим. Цілісність — це не відсутність вад, а мир із ними.",
  "110000": "Covenant — угода, укладена до того, як учасники народились. Фундамент, який ніхто не бачить, але всі стоять на ньому.",
  "110001": "Elegy — жалоба як мистецтво. Перетворює втрату на красу, не применшуючи болю. Пам'ять — єдина форма безсмертя, яку він знає.",
  "110010": "Assembly — люди, що зібрались не випадково. Кожен приніс щось своє. Разом вони стають чимось, чим жоден з них не є окремо.",
  "110011": "Fellowship — не організація, а стан серця. Ті, хто поруч, не тому що мусять, а тому що вибрали.",
  "110100": "Archive — пам'ять цивілізації. Зберігає не для минулого — для майбутнього, яке ще не знає, що воно шукає.",
  "110101": "Tradition — не консерватизм, а жива нитка між поколіннями. Те, що передається, вже не належить нікому і належить усім.",
  "110110": "Migration — рух цілого народу. Exodus — не втеча, а пошук нового берега. Разом легше нести те, що не можна залишити.",
  "110111": "Council — мудрість, що стає рішенням. Не один голос, а синтез багатьох. Рада — це момент, коли різниця стає силою.",
  "111000": "Threshold — межа між тим, чим був, і тим, чим станеш. Стояти на ній — вже акт вибору. Переступити — незворотнє.",
  "111001": "Convergence — коли різні потоки нарешті зустрічаються. Не злиття, а момент розпізнавання: ми йшли до одного.",
  "111010": "Inception — початок, що вже містить у собі ціле. Перший камінь — це не просто камінь, це вся будівля в зародку.",
  "111011": "Alliance — союз між тими, хто різний. Міцніший, ніж союз між подібними, бо тримається на виборі, а не на схожості.",
  "111100": "Vigil — пильність як медитація. Не напруга очікування, а спокійна увага до того, що є, без страху перед тим, що може бути.",
  "111101": "Harvest — кульмінація всього посіяного. Не тільки успіх — також і помилки, що дозріли в уроки. Жнива беруть усе.",
  "111110": "Uprising — революція починається не з зброї, а з відмови терпіти. Він несе в собі той момент, коли «ні» стає голоснішим за страх.",
  "111111": "Conciliar — єдність усього. Не розчинення в загальному, а стан, де власне «я» і ціле більше не суперечать одне одному. Екстаз.",
};

// Mapping archetype bin → ROSE_Q indices (0-based, max 3 per archetype)
const ARCH_QUALITIES = {
  "000000": [11, 5], "000001": [12, 8], "000010": [13, 10], "000011": [9, 0], "000100": [11, 4], "000101": [0, 5], "000110": [2, 5], "000111": [10, 3],
  "001000": [12, 0], "001001": [8, 5], "001010": [11, 6], "001011": [2, 6], "001100": [7, 0], "001101": [11, 4], "001110": [13, 1], "001111": [14, 15],
  "010000": [11, 0], "010001": [14, 1], "010010": [6, 1], "010011": [10, 8], "010100": [6, 11], "010101": [3, 8], "010110": [5, 3], "010111": [0, 9],
  "011000": [10, 5], "011001": [8, 9], "011010": [1, 10], "011011": [13, 10], "011100": [11, 6], "011101": [6, 8], "011110": [9, 13], "011111": [10, 0],
  "100000": [11, 0], "100001": [14, 7], "100010": [0, 7], "100011": [3, 4], "100100": [8, 0], "100101": [5, 7], "100110": [10, 12], "100111": [5, 2],
  "101000": [12, 0], "101001": [7, 8], "101010": [13, 6], "101011": [1, 5], "101100": [0, 7], "101101": [11, 6], "101110": [5, 13], "101111": [2, 14],
  "110000": [15, 12], "110001": [14, 7], "110010": [15, 1], "110011": [15, 2], "110100": [5, 10], "110101": [0, 4], "110110": [6, 15], "110111": [3, 9],
  "111000": [12, 13], "111001": [10, 8], "111010": [13, 15], "111011": [15, 6], "111100": [11, 7], "111101": [9, 14], "111110": [12, 6], "111111": [15, 2],
};

// ── ACADEMY PANEL ──
// Sparkle particles for archetype detail card
function ArchParticles({ col, where }) {
  const shapes = { SOUTH: "✦", NORTH: "·", EAST: "◦", WEST: "○" };
  const sym = shapes[where] || "·";
  return (<div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
    {[...Array(6)].map((_, i) => {
      const delay = (i * 0.22).toFixed(2); const dur = (1.5 + i * 0.28).toFixed(2);
      return (<div key={i} style={{ position: "absolute", left: "50%", top: "50%", fontSize: where === "SOUTH" ? 9 : 7, color: col, opacity: 0, "--a": `${(i / 6) * 360}deg`, animation: `sparkRing ${dur}s ${delay}s ease-out infinite` }}>{sym}</div>);
    })}
  </div>);
}

function ArchetypesTab({ gs, onUpdateGs, stage }) {
  const [fWho, setFWho] = useState(null);
  const [fWhere, setFWhere] = useState(null);
  const [fWhen, setFWhen] = useState(null);
  const [search, setSearch] = useState("");
  const [fQuality, setFQuality] = useState(null);
  const [detail, setDetail] = useState(null);
  const [noteText, setNoteText] = useState("");
  const stageRequired = useMemo(() => new Set(stage?.required || []), [stage]);
  const filtered = useMemo(() => ALL.filter(a => {
    if (fWho && a.who !== fWho) return false;
    if (fWhere && a.where !== fWhere) return false;
    if (fWhen && a.when !== fWhen) return false;
    if (search) { const q = search.toLowerCase(); if (!a.name.toLowerCase().includes(q) && !a.key.toLowerCase().includes(q)) return false; }
    if (fQuality !== null && !(ARCH_QUALITIES[a.bin] || []).includes(fQuality)) return false;
    return true;
  }), [fWho, fWhere, fWhen, search, fQuality]);
  const used = gs.used instanceof Set ? gs.used : new Set(gs.used || []);

  const openDetail = (a) => {
    setDetail(a);
    setNoteText((gs.notes || {})[a.bin] || "");
  };
  const saveNote = (bin, txt) => {
    if (onUpdateGs) onUpdateGs(p => ({ ...p, notes: { ...(p.notes || {}), [bin]: txt } }));
  };

  return (<div>
    {/* Search */}
    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔎 Назва або ключове слово…" style={{ width: "100%", background: "#0a0804", border: "1px solid #2a1c0a", borderRadius: 8, padding: "6px 10px", color: "#d4a060", fontSize: 11, marginBottom: 6, boxSizing: "border-box", outline: "none" }} />
    {/* Filter row */}
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
      {WHO_VALS.map(v => (<button key={v} onClick={() => setFWho(p => p === v ? null : v)} style={{ padding: "3px 7px", borderRadius: 6, cursor: "pointer", fontSize: 11, background: fWho === v ? `hsl(${WHO_HUE[v]},55%,18%)` : "#0e0c06", border: `1px solid ${fWho === v ? `hsl(${WHO_HUE[v]},55%,45%)` : "#2a1c0a"}`, color: fWho === v ? `hsl(${WHO_HUE[v]},75%,65%)` : "#7a5828" }}>{WHO_UA[v]}</button>))}
      {WHERE_VALS.map(v => (<button key={v} onClick={() => setFWhere(p => p === v ? null : v)} style={{ padding: "3px 7px", borderRadius: 6, cursor: "pointer", fontSize: 11, background: fWhere === v ? "#0e180e" : "#0e0c06", border: `1px solid ${fWhere === v ? "#4ade8055" : "#2a1c0a"}`, color: fWhere === v ? "#4ade80" : "#7a5828" }}>{WHERE_UA[v]}</button>))}
      {WHEN_VALS.map(v => (<button key={v} onClick={() => setFWhen(p => p === v ? null : v)} style={{ padding: "3px 7px", borderRadius: 6, cursor: "pointer", fontSize: 11, background: fWhen === v ? "#180e00" : "#0e0c06", border: `1px solid ${fWhen === v ? "#f8b50055" : "#2a1c0a"}`, color: fWhen === v ? "#f8b500" : "#7a5828" }}>{WHEN_UA[v]}</button>))}
      {(fWho || fWhere || fWhen || search) && <button onClick={() => { setFWho(null); setFWhere(null); setFWhen(null); setSearch(""); }} style={{ padding: "3px 7px", borderRadius: 6, cursor: "pointer", fontSize: 11, background: "transparent", border: "1px solid #c05030", color: "#c05030" }}>✕</button>}
    </div>
    {/* Quality filter */}
    <div style={{ marginBottom: 6, display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 10, color: "#8a6030", fontFamily: "monospace" }}>Якість:</span>
      <button onClick={() => setFQuality(null)} style={{ padding: "2px 6px", borderRadius: 5, cursor: "pointer", fontSize: 10, background: fQuality === null ? "#c8900a22" : "#0e0c06", border: `1px solid ${fQuality === null ? "#c8900a" : "#2a1c0a"}`, color: fQuality === null ? "#c8900a" : "#6a4010" }}>Всі</button>
      {ROSE_Q.map((q, i) => (<button key={i} onClick={() => setFQuality(fQuality === i ? null : i)} title={q.title} style={{ padding: "2px 4px", borderRadius: 5, cursor: "pointer", fontSize: 12, background: fQuality === i ? "#c8900a22" : "#0e0c06", border: `1px solid ${fQuality === i ? "#c8900a55" : "#2a1c0a"}` }}>{q.icon}</button>))}
    </div>
    {stage && stageRequired.size > 0 && (<div style={{ marginBottom: 6, fontSize: 11, background: "#1a0e04", border: "1px solid #c8900a33", borderRadius: 6, padding: "3px 9px", color: "#c8900a", display: "inline-flex", gap: 5 }}>
      {stage.sym} зібрано {[...stageRequired].filter(b => used.has(b)).length}/{stageRequired.size} — ★ в сітці
    </div>)}
    <div style={{ fontSize: 10, color: "#6a4010", fontFamily: "monospace", marginBottom: 6 }}>{filtered.filter(a => used.has(a.bin)).length}/{filtered.length} вивчено</div>
    {/* Grid */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
      {filtered.map(a => {
        const seen = used.has(a.bin);
        const isReq = stageRequired.has(a.bin);
        const col = ac(a.who, a.where, a.when);
        const clip = getArchClip(a);
        const hasNote = !!(gs.notes || {})[a.bin];
        return (<div key={a.bin} onClick={() => openDetail(a)} style={{ background: seen ? `linear-gradient(145deg,${col}18,#0a0806)` : "#0c0a06", border: `1px solid ${isReq ? col + "99" : seen ? col + "44" : "#1e1408"}`, borderRadius: 9, padding: "7px 4px 6px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, opacity: seen ? 1 : .42, transition: "all .15s", boxShadow: isReq ? `0 0 14px ${col}44,0 0 4px ${col}22` : seen ? `0 0 10px ${col}22` : "none", position: "relative" }}>
          <div style={{ width: 24, height: 24, flexShrink: 0, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: getArchTexture(a, col), clipPath: clip, opacity: .5 }} />
            <div style={{ position: "absolute", inset: 0, background: col, clipPath: clip, opacity: seen ? .7 : .4 }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: isReq ? col : seen ? col : "#6a4010", fontFamily: "Georgia,serif", textAlign: "center", lineHeight: 1.1, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>{a.name}</div>
          {isReq && <div style={{ position: "absolute", top: 2, left: 3, fontSize: 8, color: col }}>★</div>}
          {hasNote && <div style={{ position: "absolute", top: 2, right: 3, fontSize: 7, color: "#c8900a" }}>✎</div>}
        </div>);
      })}
    </div>

    {/* ── DETAIL MODAL ── */}
    {detail && (() => {
      const col = ac(detail.who, detail.where, detail.when);
      const clip = getArchClip(detail);
      const tex = getArchTexture(detail, col);
      const g = WHEN_GLOW_DATA[detail.bin.slice(4, 6)] || WHEN_GLOW_DATA["00"];
      const lore = ARCH_LORE[detail.bin] || "";
      const quals = (ARCH_QUALITIES[detail.bin] || []).map(i => ROSE_Q[i]).filter(Boolean);
      const usageCount = (gs.log || []).filter(e => (e.ingredients || []).includes(detail.name)).length;
      const formulasWithArch = (gs.discoveredFormulas || []).filter(f => f.includes(detail.bin));
      const stagesNeedingArch = STAGES.filter(s => (s.required || []).includes(detail.bin));
      const note = (gs.notes || {})[detail.bin] || "";

      return (<div style={{ position: "fixed", inset: 0, background: "rgba(2,1,0,.94)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setDetail(null)}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: `linear-gradient(170deg,${col}12,#120e04,#0a0804)`, borderRadius: "20px 20px 0 0", border: `1px solid ${col}44`, borderBottom: "none", padding: "16px 14px 28px", animation: "sheetIn .28s cubic-bezier(.32,.72,0,1)", maxHeight: "88vh", overflowY: "auto", boxShadow: `0 -8px 40px ${col}18` }}>
          <div style={{ width: 34, height: 4, background: col + "55", borderRadius: 2, margin: "0 auto 14px" }} />

          {/* ── Big animated shape with particles + rings ── */}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ flexShrink: 0, width: 72, height: 72, position: "relative", cursor: "pointer" }} onClick={() => { try { playArchSound(detail); } catch (e) { } }}>
              {/* Pulsing rings — speed = WHEN */}
              {[{ sz: -10, op: "33" }, { sz: -18, op: "1a" }].map(({ sz, op }, ri) => (<div key={ri} style={{ position: "absolute", inset: sz, borderRadius: "50%", border: `1.5px solid ${col}${op}`, animation: `pulse ${({ "00": 3.5, "01": 2.5, "10": 1.8, "11": 1.1 }[detail.bin.slice(4, 6)] || 2.5) * (1 + ri * 0.5)}s ease-in-out infinite` }} />))}
              <div style={{ position: "absolute", inset: 0, background: tex, clipPath: clip, opacity: .55, borderRadius: 2 }} />
              <div style={{ position: "absolute", inset: 0, background: col, clipPath: clip, opacity: .65, animation: `${["floatY", "floatR", "pulseScale", "pulse"][["00", "01", "10", "11"].indexOf(detail.bin.slice(4, 6)) || 0]} ${g.spd}s ease-in-out infinite`, filter: `drop-shadow(0 0 10px ${col}88)` }} />
              <div style={{ position: "absolute", inset: -4, background: `radial-gradient(circle,${col}22,transparent 70%)`, animation: `pulse ${g.spd * 1.5}s ease-in-out infinite` }} />
              <ArchParticles col={col} where={detail.where} />
              <div style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: col + "aa", fontFamily: "monospace", whiteSpace: "nowrap" }}>▶ звук</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: col, fontFamily: "Georgia,serif", lineHeight: 1 }}>{detail.name}</div>
              <div style={{ fontSize: 10, color: col + "88", fontFamily: "monospace", marginTop: 2, marginBottom: 6 }}>{detail.bin}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {[["ХТО", WHO_UA[detail.who], `hsl(${WHO_HUE[detail.who]},65%,58%)`], ["ДЕ", WHERE_UA[detail.where], "#a0c0e0"], ["КОЛИ", WHEN_UA[detail.when], "#e0c060"]].map(([lb, v, c]) => (<div key={lb} style={{ background: "#0e0c06", border: `1px solid ${c}33`, borderRadius: 6, padding: "3px 7px", textAlign: "center" }}><div style={{ fontSize: 8.5, color: c + "aa", fontFamily: "monospace" }}>{lb}</div><div style={{ fontSize: 10.5, fontWeight: 700, color: c }}>{v}</div></div>))}
              </div>
            </div>
          </div>

          {/* ── Lore ── */}
          <div style={{ background: "#0a0804", borderRadius: 10, padding: "9px 11px", marginBottom: 8, border: `1px solid ${col}22` }}>
            <div style={{ fontSize: 9, color: col, letterSpacing: 2, fontFamily: "monospace", marginBottom: 4 }}>СУТНІСТЬ</div>
            <div style={{ fontSize: 12, color: "#d4b870", fontStyle: "italic", lineHeight: 1.65, fontFamily: "Georgia,serif" }}>{lore}</div>
          </div>

          {/* ── Key ── */}
          <div style={{ background: "#08070300", borderRadius: 9, padding: "6px 10px", marginBottom: 8, border: "1px solid #2a1c08" }}>
            <div style={{ fontSize: 9, color: "#c8900a", letterSpacing: 2, fontFamily: "monospace", marginBottom: 2 }}>КЛЮЧ</div>
            <div style={{ fontSize: 11.5, color: "#e0c060", lineHeight: 1.4 }}>{detail.key}</div>
          </div>

          {/* ── Qualities ── */}
          {quals.length > 0 && (<div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: "#c8900a", letterSpacing: 2, fontFamily: "monospace", marginBottom: 5 }}>ЯКОСТІ РОЗЕНКРЕЙЦЕРА</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {quals.map(q => (<div key={q.num} style={{ display: "flex", alignItems: "center", gap: 4, background: "#0e0c06", border: "1px solid #c8900a33", borderRadius: 7, padding: "4px 8px" }}><span style={{ fontSize: 14 }}>{q.icon}</span><div><div style={{ fontSize: 9, color: "#c8900a", fontFamily: "monospace" }}>{q.num}</div><div style={{ fontSize: 10.5, color: "#e0c060", fontWeight: 700 }}>{q.title}</div></div></div>))}
            </div>
          </div>)}

          {/* ── Stats ── */}
          <div style={{ background: "#09080300", borderRadius: 9, padding: "8px 10px", marginBottom: 8, border: "1px solid #2a1c08" }}>
            <div style={{ fontSize: 9, color: "#c8900a", letterSpacing: 2, fontFamily: "monospace", marginBottom: 6 }}>СТАТИСТИКА</div>
            <div style={{ display: "flex", gap: 10, marginBottom: formulasWithArch.length ? 6 : 0 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: usageCount > 0 ? col : "#4a3010", fontFamily: "monospace" }}>{usageCount}</div><div style={{ fontSize: 9, color: "#7a5020" }}>разів використано</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: formulasWithArch.length > 0 ? "#e8c040" : "#4a3010", fontFamily: "monospace" }}>{formulasWithArch.length}</div><div style={{ fontSize: 9, color: "#7a5020" }}>відкритих формул</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: stagesNeedingArch.length ? "#f07070" : "#4a3010", fontFamily: "monospace" }}>{stagesNeedingArch.length}</div><div style={{ fontSize: 9, color: "#7a5020" }}>стадій вимагають</div></div>
            </div>
            {stagesNeedingArch.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {stagesNeedingArch.map(s => (<div key={s.id} style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 5, background: `${s.ac}18`, border: `1px solid ${s.ac}44`, color: s.ac }}>{s.sym} {s.name}</div>))}
            </div>}
          </div>

          {/* ── Notes ── */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: "#c8900a", letterSpacing: 2, fontFamily: "monospace", marginBottom: 5 }}>НОТАТКИ АЛХІМІКА</div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} onBlur={() => saveNote(detail.bin, noteText)} placeholder="Запиши власні спостереження…" style={{ width: "100%", background: "#0a0804", border: `1px solid ${col}33`, borderRadius: 9, padding: "8px 10px", color: "#d4b870", fontSize: 11.5, fontFamily: "Georgia,serif", fontStyle: noteText ? "normal" : "italic", resize: "none", minHeight: 56, boxSizing: "border-box", outline: "none", lineHeight: 1.55 }} />
          </div>

          <button onClick={() => setDetail(null)} style={{ width: "100%", background: "transparent", border: `1px solid ${col}33`, borderRadius: 9, padding: "9px", cursor: "pointer", fontSize: 12, color: col, fontFamily: "Georgia,serif" }}>Закрити</button>
        </div>
      </div>);
    })()}
  </div>);
}

function ReactionsTab({ gs, onSimulate }) {
  const formulas = Array.isArray(gs.discoveredFormulas) ? gs.discoveredFormulas : (gs.discoveredFormulas instanceof Set ? [...gs.discoveredFormulas] : Object.values(gs.discoveredFormulas || {}));
  const stage = STAGES[(gs.stage || 1) - 1];
  // Hint: combinations from stage.required that haven't been tried
  const reqBins = stage?.required || [];
  const allReqPresent = reqBins.length === 3;
  const alreadyFound = formulas.some(f => f.includes(reqBins[0]) && f.includes(reqBins[1]) && f.includes(reqBins[2]));
  const used = gs.used instanceof Set ? gs.used : new Set(gs.used || []);

  return (<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {/* Stage recommendation block */}
    {allReqPresent && !alreadyFound && (<div style={{ background: `linear-gradient(135deg,${stage.ac}10,#0a0804)`, border: `1px solid ${stage.ac}44`, borderRadius: 12, padding: "10px 12px", marginBottom: 4 }}>
      <div style={{ fontSize: 9, color: stage.ac, letterSpacing: 2, fontFamily: "monospace", marginBottom: 6 }}>РЕКОМЕНДОВАНО ДЛЯ {stage.sym} {stage.name.toUpperCase()}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {reqBins.map((b, i) => { const a = ga(b); const c = ac(a.who, a.where, a.when); return (<React.Fragment key={b}><div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: c, flexShrink: 0 }} /><span style={{ fontSize: 11, color: c, fontFamily: "Georgia,serif" }}>{a.name}</span>{!used.has(b) && <span style={{ fontSize: 9, color: "#f07070" }}>?</span>}</div>{i < 2 && <span style={{ color: "#b87830", fontWeight: 700 }}>⊕</span>}</React.Fragment>); })}
      </div>
      <button onClick={() => onSimulate && onSimulate(reqBins)} style={{ background: stage.ac, border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: "#040200", fontWeight: 700, fontFamily: "Georgia,serif" }}>🔮 Відкрити в симуляторі</button>
    </div>)}
    <div style={{ fontSize: 10, color: "#6a4010", fontFamily: "monospace" }}>{formulas.length} формул відкрито</div>
    {!formulas.length && <div style={{ textAlign: "center", padding: "20px 0", color: "#6a4010", fontStyle: "italic", fontFamily: "Georgia,serif", fontSize: 13 }}>Ще жодної відкритої реакції.<br />Проведи успішну трансмутацію!</div>}
    {formulas.map((f, idx) => {
      const parts = f.split("="); if (parts.length < 2) return null;
      const [ins, rb] = parts; const inBins = ins.split("⊕");
      const archs = inBins.map(b => ga(b.trim())); const result = ga(rb.trim());
      const rc = ac(result.who, result.where, result.when);
      return (<div key={idx} style={{ background: `linear-gradient(135deg,${rc}0a,#0c0a04)`, border: `1px solid ${rc}33`, borderRadius: 11, padding: "9px 11px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
          {archs.map((a, i) => { const c = ac(a.who, a.where, a.when); return (<React.Fragment key={i}><div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: c, flexShrink: 0 }} /><span style={{ fontSize: 11, color: c, fontFamily: "Georgia,serif" }}>{a.name}</span></div>{i < 2 && <span style={{ color: "#b87830", fontSize: 12, fontWeight: 700 }}>⊕</span>}</React.Fragment>); })}
          <span style={{ color: "#b87830", fontSize: 12, fontWeight: 700 }}>=</span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: rc, boxShadow: `0 0 6px ${rc}`, flexShrink: 0 }} /><span style={{ fontSize: 11, fontWeight: 700, color: rc, fontFamily: "Georgia,serif" }}>{result.name}</span></div>
        </div>
        <div style={{ fontSize: 9, color: "#6a4010", fontFamily: "monospace" }}>{f}</div>
      </div>);
    })}
  </div>);
}

function SimulatorTab({ initialBins, gs }) {
  const [slots, setSlots] = useState(() => [
    initialBins?.[0] ? ga(initialBins[0]) : null,
    initialBins?.[1] ? ga(initialBins[1]) : null,
    initialBins?.[2] ? ga(initialBins[2]) : null,
  ]);
  React.useEffect(() => {
    if (initialBins?.length === 3) setSlots(initialBins.map(b => b ? ga(b) : null));
  }, [initialBins?.join?.(",")]);
  const set = (i, bin) => setSlots(prev => { const n = [...prev]; n[i] = bin ? ga(bin) : null; return n; });
  const randomize = () => {
    const pool = [...ALL];
    const pick = () => { const i = Math.floor(Math.random() * pool.length); return pool.splice(i, 1)[0]; };
    setSlots([pick(), pick(), pick()]);
  };
  const [a, b, c] = slots;
  const result = (a && b && c) ? ga(transmute(a.bin, b.bin, c.bin)) : null;
  const rc = result ? ac(result.who, result.where, result.when) : null;
  // Result hints
  const resultHints = result ? [
    ...STAGES.filter(s => (s.required || []).includes(result.bin)).map(s => `★ Потрібен на стадії «${s.name}» ${s.sym}`),
    ...(gs?.discoveredFormulas || []).filter(f => f.includes(`=${result.bin}`)).map(f => `⚗ Вже відкрита формула: ${f.split("=")[0]}`).slice(0, 2),
    ...(STAGES.find(s => s.result === result.bin) ? [`✦ Є результатом стадії «${STAGES.find(s => s.result === result.bin).name}»`] : []),
  ] : [];
  return (<div>
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: "#8a6030", fontFamily: "monospace", flex: 1, lineHeight: 1.4 }}>Обери три архетипи — XOR без витрат</div>
      <button onClick={randomize} style={{ background: "linear-gradient(135deg,#1a1206,#0e0b04)", border: "1px solid #c8900a55", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11, color: "#c8900a", fontFamily: "Georgia,serif", whiteSpace: "nowrap" }}>🎲 Випадково</button>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
      {[0, 1, 2].map(i => {
        const arch = slots[i]; const col = arch ? ac(arch.who, arch.where, arch.when) : "#3a2810"; return (<div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 6, background: arch ? `${col}22` : "#0a0804", border: `1px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: col }}>{arch ? (() => { const clip = getArchClip(arch); return (<div style={{ width: 20, height: 20, position: "relative" }}><div style={{ position: "absolute", inset: 0, background: col, clipPath: clip }} /></div>); })() : "○"}</div>
          <select value={arch?.bin || ""} onChange={e => set(i, e.target.value)} style={{ flex: 1, background: "#0c0a04", border: `1px solid ${col}`, borderRadius: 7, color: arch ? col : "#6a4010", padding: "6px 8px", fontSize: 11, fontFamily: "Georgia,serif", cursor: "pointer" }}>
            <option value="">— Реагент {i + 1} —</option>
            {ALL.map(a => (<option key={a.bin} value={a.bin}>{a.name} ({a.who}·{a.where}·{a.when.slice(0, 3)})</option>))}
          </select>
          {arch && <button onClick={() => set(i, null)} style={{ background: "none", border: "none", color: "#7a3820", cursor: "pointer", fontSize: 14, padding: "2px 4px" }}>✕</button>}
        </div>);
      })}
    </div>
    {slots.some(Boolean) && (<div style={{ background: "#0c0904", border: "1px solid #1c1208", borderRadius: 9, padding: "7px 10px", marginBottom: 10, fontFamily: "monospace", fontSize: 10.5, color: "#a87840", display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
      {slots.map((s, i) => s ? (<span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}><span style={{ color: ac(s.who, s.where, s.when), fontWeight: 700 }}>{s.bin}</span>{i < 2 && slots[i + 1] && <span style={{ color: "#b87830", fontWeight: 700 }}>⊕</span>}</span>) : null)}
      {result && <><span style={{ color: "#b87830", fontWeight: 700 }}>=</span><span style={{ color: rc, fontWeight: 700 }}>{result.bin}</span></>}
    </div>)}
    {result && (<div style={{ background: `linear-gradient(135deg,${rc}18,#0c0a04)`, border: `1.5px solid ${rc}55`, borderRadius: 12, padding: "14px", animation: "revealIn .3s ease" }}>
      <div style={{ fontSize: 11, color: "#c08040", letterSpacing: 2, fontFamily: "monospace", marginBottom: 8 }}>✦ РЕЗУЛЬТАТ ТРАНСМУТАЦІЇ</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 40, height: 40, flexShrink: 0, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: getArchTexture(result, rc), clipPath: getArchClip(result), opacity: .6 }} />
          <div style={{ position: "absolute", inset: 0, background: rc, clipPath: getArchClip(result), opacity: .6, boxShadow: `0 0 16px ${rc}aa` }} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: rc, fontFamily: "Georgia,serif", lineHeight: 1 }}>{result.name}</div>
          <div style={{ fontSize: 11, color: "#c09040", fontStyle: "italic", marginTop: 2 }}>{result.key}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: resultHints.length ? 8 : 0 }}>
        {[["ХТО", WHO_UA[result.who], `hsl(${WHO_HUE[result.who]},65%,58%)`], ["ДЕ", WHERE_UA[result.where], "#a0c0e0"], ["КОЛИ", WHEN_UA[result.when], "#e0c060"]].map(([lb, v, col]) => (<div key={lb} style={{ background: "#0e0c06", border: `1px solid ${col}44`, borderRadius: 7, padding: "4px 8px" }}><div style={{ fontSize: 9, color: col, fontFamily: "monospace" }}>{lb}</div><div style={{ fontSize: 11, fontWeight: 700, color: col }}>{v}</div></div>))}
      </div>
      {resultHints.length > 0 && (<div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "7px 9px", background: "#0a0804", borderRadius: 8, border: `1px solid ${rc}22` }}>
        {resultHints.map((h, i) => (<div key={i} style={{ fontSize: 10.5, color: "#c8b060", fontFamily: "Georgia,serif" }}>{h}</div>))}
      </div>)}
    </div>)}
    {!result && !slots.some(Boolean) && (<div style={{ textAlign: "center", padding: "20px 0", color: "#4a2e10", fontStyle: "italic", fontFamily: "Georgia,serif", fontSize: 12 }}>Оберіть три архетипи або натисніть 🎲 для випадкової комбінації</div>)}
  </div>);
}

function ArchiveTab() {
  const [section, setSection] = useState("letters");
  const [letterIdx, setLetterIdx] = useState(0);
  const [narIdx, setNarIdx] = useState(0);
  return (<div>
    <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
      {[["letters", "✉ Листи"], ["narratives", "📖 Оповіді"], ["qualities", "🌹 Якості"]].map(([id, lb]) => (<button key={id} onClick={() => setSection(id)} style={{ flex: 1, background: section === id ? "#c8900a" : "#1a1206", border: section === id ? "none" : "1px solid #c8900a33", borderRadius: 7, padding: "6px 2px", cursor: "pointer", fontSize: 10.5, color: section === id ? "#fff8e0" : "#c89040", fontWeight: section === id ? 700 : 400 }}>{lb}</button>))}
    </div>
    {section === "letters" && (<div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
        {LETTERS.map((l, i) => (<button key={i} onClick={() => setLetterIdx(i)} style={{ width: 28, height: 28, borderRadius: 6, cursor: "pointer", background: letterIdx === i ? "#c8900a" : "#0e0c06", border: `1px solid ${letterIdx === i ? "#c8900a" : "#2a1c0a"}`, color: letterIdx === i ? "#fff8e0" : "#c89040", fontSize: 13 }}>{l.seal}</button>))}
      </div>
      <LetterTab stage={letterIdx + 1} />
    </div>)}
    {section === "narratives" && (<div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
        {NARRATIVES.map((n, i) => (<button key={i} onClick={() => setNarIdx(i)} style={{ flex: 1, minWidth: 28, padding: "4px 2px", borderRadius: 6, cursor: "pointer", background: narIdx === i ? "#c8900a" : "#0e0c06", border: `1px solid ${narIdx === i ? "#c8900a" : "#2a1c0a"}`, color: narIdx === i ? "#fff8e0" : "#c89040", fontSize: 9.5, textAlign: "center" }}>{n.sym}</button>))}
      </div>
      {(() => {
        const n = NARRATIVES[narIdx]; const s = STAGES[narIdx + 1] || STAGES[STAGES.length - 1]; return (<div style={{ background: `linear-gradient(155deg,${s.bg},#040200)`, borderRadius: 14, padding: "14px", border: `1px solid ${s.ac}33` }}>
          <div style={{ textAlign: "center", marginBottom: 10 }}><div style={{ fontSize: 32, filter: `drop-shadow(0 0 10px ${s.ac})` }}>{n.sym}</div><div style={{ fontSize: 11, color: s.ac, letterSpacing: 2, marginTop: 4 }}>{n.sub}</div><div style={{ fontSize: 15, fontWeight: 700, color: "#e8c050", fontFamily: "Georgia,serif", marginTop: 2 }}>{n.title}</div></div>
          <div style={{ fontSize: 12.5, lineHeight: 1.82, color: "#b09050", fontFamily: "Georgia,serif", whiteSpace: "pre-wrap", marginBottom: 8 }}>{n.text}</div>
          <div style={{ fontSize: 10.5, fontStyle: "italic", color: s.ac + "88", fontFamily: "Georgia,serif", padding: "6px 10px", background: `${s.ac}07`, borderRadius: 8, border: `1px solid ${s.ac}18` }}>{n.quote}</div>
        </div>);
      })()}
    </div>)}
    {section === "qualities" && (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
      {ROSE_Q.map((q, i) => (<div key={i} style={{ background: "#0e0c06", border: "1px solid #2a1c0a", borderRadius: 10, padding: "8px 7px" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}><span style={{ fontSize: 16, flexShrink: 0 }}>{q.icon}</span><div style={{ fontSize: 11, fontWeight: 700, color: "#c8900a", fontFamily: "Georgia,serif" }}>{q.title}</div></div>
        <div style={{ fontSize: 10.5, color: "#9a7040", lineHeight: 1.4, fontStyle: "italic" }}>{q.text}</div>
      </div>))}
    </div>)}
  </div>);
}

function LogTab({ gs }) {
  const [filterStage, setFilterStage] = useState(null);
  const [filterSuccess, setFilterSuccess] = useState(null);
  const log = [...(gs.log || [])].reverse();
  const filtered = log.filter(e => {
    if (filterStage !== null && e.stage !== filterStage) return false;
    if (filterSuccess !== null && e.success !== filterSuccess) return false;
    return true;
  });
  if (!log.length) return (<div style={{ textAlign: "center", padding: "28px 0", color: "#6a4010", fontStyle: "italic", fontFamily: "Georgia,serif", fontSize: 13 }}>Журнал порожній.<br />Проведи першу реакцію!</div>);
  return (<div>
    <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
      <button onClick={() => setFilterSuccess(p => p === true ? null : true)} style={{ padding: "3px 9px", borderRadius: 6, cursor: "pointer", fontSize: 11, background: filterSuccess === true ? "#041a08" : "#0e0c06", border: `1px solid ${filterSuccess === true ? "#4ade80" : "#2a1c0a"}`, color: filterSuccess === true ? "#4ade80" : "#7a5828" }}>✓ Успіхи</button>
      <button onClick={() => setFilterSuccess(p => p === false ? null : false)} style={{ padding: "3px 9px", borderRadius: 6, cursor: "pointer", fontSize: 11, background: filterSuccess === false ? "#1a0808" : "#0e0c06", border: `1px solid ${filterSuccess === false ? "#f07070" : "#2a1c0a"}`, color: filterSuccess === false ? "#f07070" : "#7a5828" }}>✗ Невдачі</button>
      {[1, 2, 3, 4, 5].map(i => (<button key={i} onClick={() => setFilterStage(p => p === i ? null : i)} style={{ padding: "3px 7px", borderRadius: 6, cursor: "pointer", fontSize: 11, background: filterStage === i ? `${STAGES[i - 1]?.ac}22` : "#0e0c06", border: `1px solid ${filterStage === i ? STAGES[i - 1]?.ac : "#2a1c0a"}`, color: filterStage === i ? STAGES[i - 1]?.ac : "#7a5828" }}>{STAGES[i - 1]?.sym}</button>))}
      {(filterStage !== null || filterSuccess !== null) && <button onClick={() => { setFilterStage(null); setFilterSuccess(null); }} style={{ padding: "3px 7px", borderRadius: 6, cursor: "pointer", fontSize: 11, background: "transparent", border: "1px solid #c05030", color: "#c05030" }}>✕</button>}
    </div>
    <div style={{ fontSize: 10, color: "#6a4010", fontFamily: "monospace", marginBottom: 6 }}>{filtered.length}/{log.length} записів</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {filtered.slice(0, 40).map((e, i) => {
        const res = ga(e.result || "000000"); const rc = ac(res.who, res.where, res.when);
        const stg = STAGES[(e.stage || 1) - 1];
        return (<div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: e.success ? "#06140a" : "#140808", border: `1px solid ${e.success ? "#2a6030" : "#6a1818"}`, borderRadius: 9, padding: "7px 9px" }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{e.success ? "✅" : "❌"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: stg?.ac || "#c8900a", fontFamily: "monospace", fontWeight: 700 }}>{stg?.sym} {stg?.name}</span>
              <span style={{ fontSize: 10, color: "#6a4010", marginLeft: "auto" }}>{e.time}</span>
            </div>
            <div style={{ fontSize: 11, color: "#9a7040", lineHeight: 1.4 }}>
              {(e.ingredients || []).join(" ⊕ ")}
              {e.success && <span style={{ color: rc, fontWeight: 700 }}> = {res.name}</span>}
            </div>
          </div>
        </div>);
      })}
      {filtered.length > 40 && <div style={{ textAlign: "center", fontSize: 11, color: "#6a4010", fontStyle: "italic" }}>Ще {filtered.length - 40} записів…</div>}
    </div>
  </div>);
}

function AffinityTab({ gs, onOpenDetail }) {
  const formulas = Array.isArray(gs.discoveredFormulas) ? gs.discoveredFormulas : [];
  const W = 320; const H = 210;

  // Build node map
  const nodeMap = useMemo(() => {
    const m = new Map();
    formulas.forEach(f => {
      const parts = f.split("="); if (parts.length < 2) return;
      const inBins = parts[0].split("⊕"); const outBin = parts[1].trim();
      [...inBins, outBin].forEach(b => {
        const key = b.trim();
        if (!m.has(key)) m.set(key, { arch: ga(key), conns: 0 });
        m.get(key).conns++;
      });
    });
    return m;
  }, [formulas.length]);

  // Initial positions from archetype coordinates
  const initPos = useMemo(() => {
    const p = new Map();
    nodeMap.forEach((v, bin) => {
      const a = v.arch;
      const wi = WHO_VALS.indexOf(a.who); const ri = WHERE_VALS.indexOf(a.where); const ni = WHEN_VALS.indexOf(a.when);
      p.set(bin, { x: Math.min(W - 22, Math.max(18, wi * (W / 4.2) + ri * (W / 18) + 22)), y: Math.min(H - 14, Math.max(14, ni * (H / 5.5) + wi * (H / 14) + 18)) });
    });
    return p;
  }, [nodeMap]);

  const [pos, setPos] = useState(() => initPos);
  const [drag, setDrag] = useState(null);// {bin,ox,oy}
  const [hovered, setHovered] = useState(null);
  const svgRef = React.useRef(null);

  // Sync positions when nodeMap changes
  React.useEffect(() => {
    setPos(p => {
      const next = new Map(p);
      initPos.forEach((v, k) => { if (!next.has(k)) next.set(k, v); });
      return next;
    });
  }, [initPos]);

  const onSvgMouseMove = React.useCallback(e => {
    if (!drag) return;
    const svg = svgRef.current; if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = Math.min(W - 10, Math.max(10, (e.clientX - r.left) * (W / r.width) - drag.ox));
    const y = Math.min(H - 10, Math.max(10, (e.clientY - r.top) * (H / r.height) - drag.oy));
    setPos(p => { const n = new Map(p); n.set(drag.bin, { x, y }); return n; });
  }, [drag]);
  const onSvgMouseUp = React.useCallback(() => setDrag(null), []);

  if (!formulas.length) return (<div style={{ textAlign: "center", padding: "28px 0", color: "#6a4010", fontStyle: "italic", fontFamily: "Georgia,serif", fontSize: 13 }}>Немає відкритих формул.<br />Проведи успішну трансмутацію!</div>);

  return (<div>
    <div style={{ fontSize: 10, color: "#6a4010", fontFamily: "monospace", marginBottom: 6 }}>{nodeMap.size} вузлів · {formulas.length} формул · перетягуй вузли</div>
    <div style={{ background: "#060504", borderRadius: 12, border: "1px solid #1e1408", overflow: "hidden", userSelect: "none" }}>
      <svg ref={svgRef} width={W} height={H} style={{ display: "block", cursor: drag ? "grabbing" : "default" }}
        onMouseMove={onSvgMouseMove} onMouseUp={onSvgMouseUp} onMouseLeave={onSvgMouseUp}>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {/* Edges with animated flow */}
        {formulas.map((f, fi) => {
          const parts = f.split("="); if (parts.length < 2) return null;
          const inBins = parts[0].split("⊕"); const outBin = parts[1].trim();
          const outP = pos.get(outBin.trim()); if (!outP) return null;
          return inBins.map((b, bi) => {
            const p = pos.get(b.trim()); if (!p) return null;
            const isHov = hovered === b.trim() || hovered === outBin.trim();
            const outCol = ac(ga(outBin.trim()).who, ga(outBin.trim()).where, ga(outBin.trim()).when);
            const edgeId = `edge-${fi}-${bi}`;
            const len = Math.hypot(outP.x - p.x, outP.y - p.y) || 1;
            const dur = (len / 60).toFixed(2);
            return (<g key={`${fi}-${bi}`}>
              <line id={edgeId} x1={p.x} y1={p.y} x2={outP.x} y2={outP.y}
                stroke={isHov ? outCol + "88" : "#2a1c0844"} strokeWidth={isHov ? 1.8 : 1}
                strokeDasharray={isHov ? "none" : "4 3"} />
              {isHov && (<circle r={2.5} fill={outCol} opacity={.9}>
                <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={`M${p.x},${p.y} L${outP.x},${outP.y}`} />
              </circle>)}
            </g>);
          });
        })}
        {/* Nodes */}
        {[...nodeMap.entries()].map(([bin, { arch, conns }]) => {
          const p = pos.get(bin); if (!p) return null;
          const col = ac(arch.who, arch.where, arch.when);
          const r = Math.min(9, 3 + conns * 1.8);
          const isHov = hovered === bin; const isDrag = drag?.bin === bin;
          return (<g key={bin} style={{ cursor: isDrag ? "grabbing" : "grab" }}
            onMouseEnter={() => setHovered(bin)} onMouseLeave={() => setHovered(null)}
            onMouseDown={e => {
              const svg = svgRef.current; const rect = svg.getBoundingClientRect();
              const mx = (e.clientX - rect.left) * (W / rect.width);
              const my = (e.clientY - rect.top) * (H / rect.height);
              setDrag({ bin, ox: mx - p.x, oy: my - p.y }); e.preventDefault();
            }}
            onClick={() => !isDrag && onOpenDetail && onOpenDetail(arch)}>
            {isHov && <circle cx={p.x} cy={p.y} r={r + 5} fill={col + "18"} />}
            <circle cx={p.x} cy={p.y} r={r} fill={isHov ? col : col + "cc"}
              stroke={isHov ? "#fff9" : "none"} strokeWidth={1}
              filter={isHov ? "url(#glow)" : "none"} />
            {isHov && <text x={p.x} y={p.y - r - 5} textAnchor="middle" fill="#e8c040"
              fontSize={9} fontFamily="Georgia,serif" style={{ pointerEvents: "none" }}>{arch.name}</text>}
          </g>);
        })}
      </svg>
    </div>
    <div style={{ fontSize: 9.5, color: "#6a4010", fontStyle: "italic", marginTop: 5, fontFamily: "Georgia,serif", textAlign: "center" }}>Перетягуй · клік = деталі · розмір = кількість зв'язків</div>
  </div>);
}

function ChroniclesTab({ gs }) {
  const earned = gs.earned || [];
  const log = gs.log || [];
  const completedStages = useMemo(() => {
    const s = new Set();
    log.filter(e => e.success && e.stage).forEach(e => s.add(e.stage));
    if (gs.stage > 1) for (let i = 1; i < gs.stage; i++)s.add(i);
    return s;
  }, [log, gs.stage]);

  // Build timeline: stages + achievements
  const events = useMemo(() => {
    const evts = [];
    // Completed stages
    [...completedStages].sort((a, b) => b - a).forEach(stageId => {
      const s = STAGES[stageId - 1]; if (!s) return;
      const n = NARRATIVES[stageId - 1];
      evts.push({ type: "stage", stageId, icon: s.sym, title: s.name, sub: n?.title || s.sub, text: n?.quote, col: s.ac });
    });
    // Achievements
    earned.forEach(id => {
      const a = ACH[id]; if (!a) return;
      evts.push({ type: "ach", icon: a.icon, title: a.title, sub: a.desc, col: "#c8900a" });
    });
    return evts;
  }, [completedStages, earned]);

  if (!events.length) return (<div style={{ textAlign: "center", padding: "28px 0", color: "#6a4010", fontStyle: "italic", fontFamily: "Georgia,serif", fontSize: 13 }}>Хроніки порожні.<br />Пройди першу стадію, щоб почати!</div>);
  return (<div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
    <div style={{ fontSize: 10, color: "#6a4010", fontFamily: "monospace", marginBottom: 10 }}>{events.length} подій в хронологіях</div>
    {events.map((e, i) => (<div key={i} style={{ display: "flex", gap: 10, position: "relative", paddingBottom: 12 }}>
      {/* Timeline line */}
      {i < events.length - 1 && <div style={{ position: "absolute", left: 17, top: 28, width: 1, bottom: 0, background: "linear-gradient(to bottom,#c8900a33,transparent)" }} />}
      {/* Icon */}
      <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", background: e.type === "stage" ? `${e.col}18` : "#1a1206", border: `1px solid ${e.col}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, zIndex: 1 }}>
        {e.icon}
      </div>
      <div style={{ flex: 1, paddingTop: 2 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "baseline", marginBottom: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: e.col, fontFamily: "Georgia,serif" }}>{e.title}</div>
          <div style={{ fontSize: 10, color: "#6a4010", fontStyle: "italic" }}>{e.sub}</div>
        </div>
        {e.text && <div style={{ fontSize: 11, color: "#9a7040", fontStyle: "italic", lineHeight: 1.5, fontFamily: "Georgia,serif" }}>{e.text}</div>}
      </div>
    </div>))}
  </div>);
}

const GLOSSARY = [
  { term: "XOR", ico: "⊕", text: "Побітове виключне АБО. Для кожного з 6 бітів: якщо біти однакові — результат 0, різні — 1. Три архетипи A⊕B⊕C: спочатку A⊕B, потім результат ⊕C." },
  { term: "Архетип", ico: "✦", text: "Одна з 64 сутностей, закодованих 6 бітами (ХТО·ДЕ·КОЛИ). Кожен має унікальний вигляд, звук, лор і ключове слово. Разом вони утворюють алхімічний алфавіт." },
  { term: "Трансмутація", ico: "⚗", text: "Реакція трьох архетипів-реагентів. Результат = XOR їхніх бінарних кодів. Успіх залежить від температури, пори року і точності вибору архетипів." },
  { term: "Чистота", ico: "💎", text: "Головний ресурс душі. Знижується при невдалих реакціях і жертві. Якщо впаде до нуля — гра завершується. Деякі дії відновлюють чистоту." },
  { term: "Резонанс", ico: "🎵", text: "Особлива подія: коли всі три реагенти мають однаковий атрибут (ХТО, ДЕ або КОЛИ). Дає бонус чистоти і позначається у журналі." },
  { term: "Азот", ico: "💧", text: "Найрідкісніший ресурс. Потрібен на вищих стадіях. Здобувається через дистиляцію або нагороди за стадії. Символ трансформаційного потенціалу." },
  { term: "Стадія", ico: "🔮", text: "Одна з 10 фаз Magnum Opus (від Нігредо до Resurrectio). Кожна потребує конкретної комбінації трьох архетипів у певному тепловому діапазоні." },
  { term: "Нігредо·Альбедо·etc", ico: "☽", text: "Стадії алхімічного Великого Діяння: Чорніння→Біління→Жовтіння→Червоніння→Шлюб→Камінь→Апофеоз→Множення→Проекція→Воскресіння." },
];

function GlossaryModal({ onClose }) {
  useEscClose(onClose);
  const [sel, setSel] = useState(null);
  return (<div style={{ position: "fixed", inset: 0, background: "rgba(2,1,0,.94)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "linear-gradient(165deg,#1e1608,#0e0b04)", borderRadius: "20px 20px 0 0", border: "1px solid #c8900a44", borderBottom: "none", padding: "16px 14px 28px", animation: "sheetIn .28s cubic-bezier(.32,.72,0,1)", maxHeight: "80vh", overflowY: "auto" }}>
      <div style={{ width: 34, height: 4, background: "#c8900a55", borderRadius: 2, margin: "0 auto 12px" }} />
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e8c040", fontFamily: "Georgia,serif" }}>📖 ГЛОСАРІЙ</div>
        <div style={{ fontSize: 10, color: "#8a6030", fontStyle: "italic", marginTop: 2 }}>Ключові поняття алхімічної гри</div>
      </div>
      {sel === null ? (<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {GLOSSARY.map((g, i) => (<button key={i} onClick={() => setSel(i)} style={{ background: "#0e0c06", border: "1px solid #2a1c0a", borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{g.ico}</span>
          <div style={{ fontSize: 12, color: "#c8900a", fontWeight: 700, fontFamily: "Georgia,serif" }}>{g.term}</div>
        </button>))}
      </div>) : (<div>
        <button onClick={() => setSel(null)} style={{ background: "transparent", border: "1px solid #c8900a33", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: "#c89040", marginBottom: 14 }}>← Назад</button>
        <div style={{ textAlign: "center", marginBottom: 14 }}><div style={{ fontSize: 40, marginBottom: 4 }}>{GLOSSARY[sel].ico}</div><div style={{ fontSize: 17, fontWeight: 700, color: "#e8c040", fontFamily: "Georgia,serif" }}>{GLOSSARY[sel].term}</div></div>
        <div style={{ fontSize: 13, lineHeight: 1.75, color: "#d4a860", fontFamily: "Georgia,serif", fontStyle: "italic", padding: "12px", background: "#0c0a04", borderRadius: 11, border: "1px solid #2a1c08" }}>{GLOSSARY[sel].text}</div>
      </div>)}
      <button onClick={onClose} style={{ width: "100%", marginTop: 14, background: "transparent", border: "1px solid #2a1c0a", borderRadius: 9, padding: "9px", cursor: "pointer", fontSize: 12, color: "#c89040", fontFamily: "Georgia,serif" }}>Закрити</button>
    </div>
  </div>);
}

const TOUR_STEPS = [
  { tab: "archetypes", text: "📚 Архетипи — всі 64 сутності. Фільтруй за ХТО/ДЕ/КОЛИ, шукай за назвою. Зірка ★ — потрібен для поточної стадії. Клікни на картку — відкриється повний портрет." },
  { tab: "reactions", text: "⚗ Реакції — список відкритих формул. Якщо стадія ще не пройдена, ми підкажемо потрібну комбінацію і відкриємо її прямо в симуляторі." },
  { tab: "simulator", text: "🔮 Симулятор — експериментуй без витрат. Натисни 🎲 для випадкової комбінації або вибери самостійно. Під результатом — підказки про його роль у грі." },
  { tab: "affinity", text: "🕸 Афінності — граф зв'язків між архетипами. Перетягуй вузли, наведи — побачиш анімований потік. Клік відкриває картку архетипу." },
  { tab: "archive", text: "📜 Архів — листи алхіміків з підказками, оповіді стадій та 16 якостей Розенкрейцера. Тут заховані ключі до розуміння реакцій." },
  { tab: "chronicles", text: "📅 Хроніки — твоя особиста часова лінія: пройдені стадії, отримані досягнення. Тут залишається слід твого Великого Діяння." },
  { tab: "log", text: "📋 Журнал — повна історія дослідів з фільтрацією. Знайди будь-яку реакцію, проаналізуй невдачі." },
];

// Per-tab tips shown once
const ACADEMY_TIPS = {
  archetypes: { ico: "📚", text: "Клікни на будь-який архетип — відкриється портрет із лором, якостями та власними нотатками. Зірка ★ = потрібен для поточної стадії." },
  reactions: { ico: "⚗", text: "Тут збираються всі відкриті тобою формули. Якщо стадія ще не пройдена — побачиш підказку з рекомендованою комбінацією." },
  simulator: { ico: "🔮", text: "Обери три архетипи — результат XOR з'явиться миттєво, без витрат. Ідеальний спосіб перевірити ідею перед дорогим дослідом." },
  affinity: { ico: "🕸", text: "Граф зв'язків між архетипами. Більший вузол = більше формул. Перетягуй вузли, клікай — відкривається картка архетипу." },
  archive: { ico: "📜", text: "Листи алхіміків, оповіді стадій та 16 якостей Розенкрейцера. Читай уважно — в текстах заховані підказки до реакцій." },
  log: { ico: "📋", text: "Повна історія дослідів. Фільтруй за стадією або результатом, щоб знайти потрібний момент." },
};

function AcademyTip({ tabId, onDismiss }) {
  const tip = ACADEMY_TIPS[tabId];
  if (!tip) return null;
  return (<div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "linear-gradient(135deg,#1a1206,#0e0b04)", border: "1px solid #c8900a55", borderRadius: 10, padding: "8px 10px", marginBottom: 8, animation: "revealIn .25s ease", position: "relative" }}>
    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{tip.ico}</span>
    <div style={{ flex: 1, fontSize: 11, color: "#d4a860", lineHeight: 1.55, fontFamily: "Georgia,serif", fontStyle: "italic" }}>{tip.text}</div>
    <button onClick={onDismiss} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 13, color: "#c8900a88", padding: "0 0 0 4px", flexShrink: 0, lineHeight: 1 }}>✕</button>
  </div>);
}

const AcademyPanel = React.memo(function AcademyPanel({ gs, onClose, onUpdateGs }) {
  useEscClose(onClose);
  const [tab, setTab] = useState("archetypes");
  const [simBins, setSimBins] = useState(null);
  const [tabKey, setTabKey] = useState(0);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [tourStep, setTourStep] = useState(null);// null=off, 0..N=step
  const [showGlossary, setShowGlossary] = useState(false);
  const stage = STAGES[(gs.stage || 1) - 1];
  const seen = gs.academyTipsSeen || [];
  const TABS = [["archetypes", "📚", "Архетипи"], ["reactions", "⚗", "Реакції"], ["simulator", "🔮", "Симулятор"], ["affinity", "🕸", "Афінності"], ["archive", "📜", "Архів"], ["chronicles", "📅", "Хроніки"], ["log", "📋", "Журнал"]];
  const switchTab = (id) => { setTab(id); setTabKey(k => k + 1); setTipDismissed(false); };
  const dismissTip = () => {
    setTipDismissed(true);
    if (onUpdateGs) onUpdateGs(p => ({ ...p, academyTipsSeen: [...new Set([...(p.academyTipsSeen || []), tab])] }));
  };
  const showTip = !tipDismissed && !seen.includes(tab) && tourStep === null;
  const handleSimulate = (bins) => { setSimBins(bins); switchTab("simulator"); };

  // Tour control
  const startTour = () => { setTourStep(0); switchTab(TOUR_STEPS[0].tab); };
  const nextTour = () => {
    const next = tourStep + 1;
    if (next >= TOUR_STEPS.length) { setTourStep(null); }
    else { setTourStep(next); switchTab(TOUR_STEPS[next].tab); }
  };
  const curTour = tourStep !== null ? TOUR_STEPS[tourStep] : null;

  return (<div style={{ position: "fixed", inset: 0, background: "rgba(4,2,0,.92)", zIndex: 400, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
    {showGlossary && <GlossaryModal onClose={() => setShowGlossary(false)} />}
    <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "linear-gradient(160deg,#1e1608,#120e04)", borderRadius: "22px 22px 0 0", border: "1px solid #c8900a33", borderBottom: "none", padding: "16px 14px 28px", animation: "sheetIn .3s cubic-bezier(.32,.72,0,1)", maxHeight: "86vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,.85)" }}>
      <div style={{ width: 34, height: 4, background: "#c8900a55", borderRadius: 2, margin: "0 auto 12px" }} />
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8c040", fontFamily: "Georgia,serif", letterSpacing: 1 }}>🏛 АКАДЕМІЯ АЛХІМІКІВ</div>
          <div style={{ fontSize: 10, color: "#8a6030", fontStyle: "italic", marginTop: 1 }}>Каталог знань та інструменти дослідника</div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={() => setShowGlossary(true)} title="Глосарій" style={{ background: "#0c0a04", border: "1px solid #c8900a33", borderRadius: 7, padding: "4px 7px", cursor: "pointer", fontSize: 12, color: "#c8900a" }}>📖</button>
          <button onClick={startTour} title="Тур по Академії" style={{ background: "#0c0a04", border: "1px solid #c8900a33", borderRadius: 7, padding: "4px 7px", cursor: "pointer", fontSize: 12, color: "#c8900a" }}>🚀</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, marginBottom: 8, flexShrink: 0, overflowX: "auto" }}>
        {TABS.map(([id, ico, lb]) => (<button key={id} onClick={() => switchTab(id)} style={{ flexShrink: 0, background: tab === id ? "linear-gradient(135deg,#2a1a08,#1e1204)" : "#0e0c06", border: `1px solid ${tab === id ? (curTour?.tab === id ? "#e8c040" : "#c8900a66") : "#1e1408"}`, borderRadius: 8, padding: "5px 7px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, transition: "all .15s", boxShadow: tab === id ? "0 0 8px #c8900a22" : curTour?.tab === id ? "0 0 10px #e8c04055" : "none", minWidth: 40, position: "relative" }}>
          <span style={{ fontSize: 13 }}>{ico}</span>
          <span style={{ fontSize: 8.5, color: tab === id ? "#e8c040" : "#6a4010", fontFamily: "monospace", fontWeight: tab === id ? 700 : 400 }}>{lb}</span>
          {!seen.includes(id) && id !== tab && <div style={{ position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: "50%", background: "#c8900a", boxShadow: "0 0 4px #c8900a" }} />}
        </button>))}
      </div>
      {/* Tour overlay */}
      {curTour && (<div style={{ background: "linear-gradient(135deg,#241808,#140e04)", border: "1px solid #e8c04055", borderRadius: 10, padding: "10px 12px", marginBottom: 8, animation: "revealIn .25s ease", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "#e8d060", lineHeight: 1.6, fontFamily: "Georgia,serif", marginBottom: 8 }}>{curTour.text}</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "#8a6030", fontFamily: "monospace" }}>{tourStep + 1}/{TOUR_STEPS.length}</div>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => setTourStep(null)} style={{ background: "transparent", border: "1px solid #c8900a33", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: "#c89040" }}>Пропустити</button>
            <button onClick={nextTour} style={{ background: "#c8900a", border: "none", borderRadius: 7, padding: "4px 12px", cursor: "pointer", fontSize: 11, color: "#040200", fontWeight: 700 }}>{tourStep + 1 < TOUR_STEPS.length ? "Далі →" : "Завершити ✓"}</button>
          </div>
        </div>
      </div>)}
      <div key={tabKey} style={{ overflowY: "auto", flex: 1, paddingTop: 2, animation: "revealIn .2s ease" }}>
        {showTip && <AcademyTip tabId={tab} onDismiss={dismissTip} />}
        {tab === "archetypes" && <ArchetypesTab gs={gs} onUpdateGs={onUpdateGs} stage={stage} />}
        {tab === "reactions" && <ReactionsTab gs={gs} onSimulate={handleSimulate} />}
        {tab === "simulator" && <SimulatorTab initialBins={simBins} gs={gs} />}
        {tab === "affinity" && <AffinityTab gs={gs} onOpenDetail={a => { switchTab("archetypes"); }} />}
        {tab === "archive" && <ArchiveTab />}
        {tab === "chronicles" && <ChroniclesTab gs={gs} />}
        {tab === "log" && <LogTab gs={gs} />}
      </div>
    </div>
  </div>);
});

// ── GAME STATE ──
function initGs() { return { stage: 1, purity: 100, maxHeat: 0, heat: 60, resources: { mercury: 90, sulfur: 90, salt: 90, azoth: 0 }, ingredients: [], experiments: 0, successes: 0, failures: 0, streak: 0, stageFails: 0, resonances: 0, used: new Set(), earned: [], tutorialDone: false, log: [], scars: [], recov: { meditate: 0, distill: 0, gather: 0, sacrifice: false }, grimoireOpened: false, discoveredFormulas: [], notes: {}, academyTipsSeen: [], ngPlus: 0 }; }
// New Game+ — preserves earned achievements + notes, harder resources
function initNgPlus(prev) {
  const base = initGs();
  const ng = (prev.ngPlus || 0) + 1;
  const resMult = Math.max(0.45, 1 - ng * 0.12);// resources start lower each run
  return {
    ...base,
    earned: prev.earned,          // keep achievements
    notes: prev.notes,            // keep notes
    discoveredFormulas: prev.discoveredFormulas, // keep found formulas
    academyTipsSeen: prev.academyTipsSeen,
    tutorialDone: true,
    ngPlus: ng,
    resources: {
      mercury: Math.round(90 * resMult),
      sulfur: Math.round(90 * resMult),
      salt: Math.round(90 * resMult),
      azoth: 0,
    },
  };
}
function gsToJson(gs) {
  const used = gs.used instanceof Set ? [...gs.used] : Array.isArray(gs.used) ? gs.used : [];
  const df = Array.isArray(gs.discoveredFormulas) ? gs.discoveredFormulas : [...(gs.discoveredFormulas || [])];
  return JSON.stringify({ ...gs, used, discoveredFormulas: df });
}
function gsFromJson(j) {
  const o = JSON.parse(j);
  return {
    ...initGs(),   // safe defaults for ALL fields
    ...o,          // override with saved data
    // fields that need special handling:
    ingredients: Array.isArray(o.ingredients) ? o.ingredients : [],
    used: new Set(o.used || []),
    earned: Array.isArray(o.earned) ? o.earned : [],
    log: Array.isArray(o.log) ? o.log : [],
    scars: Array.isArray(o.scars) ? o.scars : [],
    recov: o.recov || { meditate: 0, distill: 0, gather: 0, sacrifice: false },
    resources: o.resources || { mercury: 90, sulfur: 90, salt: 90, azoth: 0 },
    resonances: o.resonances || 0,
    grimoireOpened: o.grimoireOpened || false,
    discoveredFormulas: Array.isArray(o.discoveredFormulas) ? o.discoveredFormulas : [],
    notes: o.notes && typeof o.notes === "object" ? o.notes : {},
    academyTipsSeen: Array.isArray(o.academyTipsSeen) ? o.academyTipsSeen : [],
  };
}

// ── GS REDUCER ──
// Centralises all game-state mutations; makes doReaction easier to reason about
function gsReducer(state, action) {
  switch (action.type) {
    case "UPDATE": return action.fn(state);
    case "RESET": return action.payload;
    default: return state;
  }
}

// Escape key closes any panel/modal
function useEscClose(onClose) {
  React.useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
}

// ── MAIN GAME ──
function Game() {
  const [screen, setScreen] = useState("intro");
  const [gs, dispatchGs] = useReducer(gsReducer, undefined, initGs);
  const isFirstRender = useRef(true);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [achPop, setAchPop] = useState(null);
  const [modal, setModal] = useState(null);
  const [transAnim, setTransAnim] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [failShake, setFailShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(true);
  const [volume, setVolume] = useState(0.55);
  const [codexOpen, setCodexOpen] = useState(false);
  const [narrative, setNarrative] = useState(null);
  const [contextHint, setContextHint] = useState(null);
  const [reacting, setReacting] = useState(false);
  const [screenEffect, setScreenEffect] = useState(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const sfx = useCallback((n) => { if (sound) SFX[n]?.(); }, [sound]);
  const TOTAL = 10;
  const stage = STAGES[Math.min((gs.stage || 1) - 1, TOTAL - 1)];
  const ambient = STAGE_AMBIENT[Math.min((gs.stage || 1) - 1, STAGE_AMBIENT.length - 1)];

  // Derive cycle step for AlchemistCycle
  const inZone = gs.heat >= stage.heatMin && gs.heat <= stage.heatMax;
  const cycleStep = gs.ingredients.length === 0 ? 1 : gs.ingredients.length < 3 ? 3 : !inZone ? 4 : 5;

  // Resonance detection — memoized, used in render + doReaction
  const { whoRes, whereRes, whenRes, hasRes } = useMemo(() => {
    const ings = gs.ingredients; const len3 = ings.length === 3;
    const whoRes = len3 && ings.every(i => i.who === ings[0].who);
    const whereRes = len3 && ings.every(i => i.where === ings[0].where);
    const whenRes = len3 && ings.every(i => i.when === ings[0].when);
    return { whoRes, whereRes, whenRes, hasRes: whoRes || whereRes || whenRes };
  }, [gs.ingredients]);

  useEffect(() => {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const d = JSON.parse(raw); if (d.screen) setScreen(d.screen); if (d.gs) dispatchGs({ type: "RESET", payload: gsFromJson(d.gs) }); if (d.sound !== undefined) setSound(d.sound); } } catch (e) { }
  }, []);

  const prevSeasonRef = useRef(null);
  useEffect(() => {
    if (screen === "game" && sound) {
      const season = STAGE_SEASON[(gs.stage - 1) % STAGE_SEASON.length];
      Music.setEnabled(true);
      if (prevSeasonRef.current !== season) { prevSeasonRef.current = season; Music.startBackground(season); }
      return () => { Music.stopBackground(); prevSeasonRef.current = null; };
    } else { Music.setEnabled(false); prevSeasonRef.current = null; }
  }, [screen, gs.stage, sound]);

  // Sync volume to Music master gain
  useEffect(() => { Music.setVolume(sound ? volume : 0); }, [volume, sound]);
  useEffect(() => { if (gs.heat > 700 && sound) SFX.heatWarn(); }, [Math.floor(gs.heat / 50)]);

  // Context hints after failures
  useEffect(() => {
    if (screen !== "game") return;
    if (gs.stageFails === 1) setContextHint("Зверни увагу на кольори архетипів — колір підказує рід (ХТО) і сезон (КОЛИ).");
    else if (gs.stageFails === 2) setContextHint("Відкрий Грімуар (📜) → вкладка «Ключі» — там є підказки про кожен потрібний архетип.");
    else if (gs.stageFails === 3) setContextHint("Спробуй фільтр ХТО (Я/Ти/Ми/Вони). Загадка підказує рід — шукай слова «внутрішній», «колективний», «діалогічний».");
  }, [gs.stageFails]);

  // Ready cue when all 3 slots filled
  const prevCanRef = useRef(false);
  const canTransmute = gs.ingredients.length === 3 && !busy;
  useEffect(() => { if (canTransmute && !prevCanRef.current && sound) SFX.ready(); prevCanRef.current = canTransmute; }, [canTransmute]);

  const [saveError, setSaveError] = useState(null);
  const save = useCallback((sc, g, snd = sound) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ screen: sc, gs: gsToJson(g), sound: snd }));
      setSaveError(null);
    } catch (e) {
      // QuotaExceededError: trim log and retry once
      if (e?.name === "QuotaExceededError" || e?.code === 22) {
        try {
          const trimmed = { ...g, log: (g.log || []).slice(-20) };
          localStorage.setItem(SAVE_KEY, JSON.stringify({ screen: sc, gs: gsToJson(trimmed), sound: snd }));
          setSaveError("⚠ Журнал скорочено — мало місця");
        } catch (e2) { setSaveError("⚠ Збереження не вдалось"); }
      } else { setSaveError(null); }// silent for other errors
    }
  }, [sound]);

  // Auto-save whenever gs or screen changes (skip very first render to avoid overwriting loaded save)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    save(screen, gs);
  }, [gs, screen]);

  const upGs = useCallback((fn) => { dispatchGs({ type: "UPDATE", fn }); }, []);

  // Undo stack — stores up to 3 previous ingredients arrays
  const [undoStack, setUndoStack] = useState([]);
  const pushUndo = useCallback((prev) => { setUndoStack(s => [...s.slice(-2), prev]); }, []);
  const doUndo = useCallback(() => {
    if (!undoStack.length || busy) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    sfx("remove");
    upGs(g => ({ ...g, ingredients: prev }));
  }, [undoStack, busy, sfx, upGs]);

  // Achievement check — folded into final state to avoid race
  const applyAchievements = (g) => {
    const newAchs = Object.values(ACH).filter(a => !g.earned.includes(a.icon) && a.fn(g));
    if (newAchs.length > 0) setTimeout(() => setAchPop(newAchs[0]), 100);
    return newAchs.length > 0 ? { ...g, earned: [...g.earned, ...newAchs.map(a => a.icon)] } : g;
  };

  const addIngredient = useCallback((arch) => {
    if (gs.ingredients.length >= 3 || gs.ingredients.some(i => i.bin === arch.bin) || busy) return;
    if (sound) { playArchSound(arch); Music.playMotif(arch.when, 0.35); }
    pushUndo(gs.ingredients);
    upGs(prev => ({ ...prev, ingredients: [...prev.ingredients, arch], used: new Set([...prev.used, arch.bin]) }));
  }, [gs.ingredients, busy, sound, pushUndo, upGs]);

  const removeIngredient = useCallback((idx) => {
    if (busy) return;
    sfx("remove");
    pushUndo(gs.ingredients);
    upGs(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }));
  }, [busy, sfx, gs.ingredients, pushUndo, upGs]);

  const doReaction = async () => {
    if (gs.ingredients.length < 3 || busy) return;
    const s = stage; const res = gs.resources;
    if (res.mercury < s.cost.mercury || res.sulfur < s.cost.sulfur || res.salt < s.cost.salt || res.azoth < s.cost.azoth) {
      setToast({ icon: "⚠️", name: "Недостатньо ресурсів", msg: "Скористайся Лабораторним столом для поповнення.", fx: {} }); sfx("fail"); return;
    }
    setBusy(true); setReacting(true);
    try {
      const [a, b, c] = gs.ingredients.map(x => x.bin);
      const rb = transmute(a, b, c);
      const reqSet = new Set(s.required);
      const ingOk = [...reqSet].every(r => new Set([a, b, c]).has(r));
      const heatOk = gs.heat >= s.heatMin && gs.heat <= s.heatMax;
      const success = ingOk && heatOk;
      const timeStr = new Date().toLocaleTimeString("uk", { hour: "2-digit", minute: "2-digit" });
      const ings = gs.ingredients;
      const whoSame = ings.every(i => i.who === ings[0].who);
      const whereSame = ings.every(i => i.where === ings[0].where);
      const whenSame = ings.every(i => i.when === ings[0].when);
      const resLabel = whoSame ? "Резонанс WHO (чистота +8)" : whereSame ? "Резонанс WHERE (ресурси +20)" : whenSame ? "Резонанс WHEN (азот +4)" : null;

      if (success) {
        sfx("transmute");
        if (resLabel && sound) SFX.resonance();
        if (whenSame && sound) { Music.stopBackground(); Music.playTheme(ings[0].when, 7); }
        setTransAnim(s.ac);
        await new Promise(r => setTimeout(r, 2500));
        setTransAnim(null); setReacting(false);

        // Single batched update for all success state
        upGs(prev => {
          const rw = s.reward;
          const wasFirstTry = prev.stageFails === 0;
          let n = {
            ...prev,
            experiments: prev.experiments + 1,
            maxHeat: Math.max(prev.maxHeat, prev.heat),
            successes: prev.successes + 1,
            streak: prev.streak + 1,
            stageFails: 0,
            purity: Math.min(100, prev.purity + 4 + (whoSame ? 8 : 0) + (Math.random() < .25 ? 8 : 0)),
            resonances: (prev.resonances || 0) + (resLabel ? 1 : 0),
            swiftStages: (wasFirstTry ? (prev.swiftStages || 0) + 1 : (prev.swiftStages || 0)),
            resources: {
              mercury: Math.min(MAX_RES, Math.max(0, prev.resources.mercury - s.cost.mercury + rw.mercury + (whereSame ? 20 : 0))),
              sulfur: Math.min(MAX_RES, Math.max(0, prev.resources.sulfur - s.cost.sulfur + rw.sulfur)),
              salt: Math.min(MAX_RES, Math.max(0, prev.resources.salt - s.cost.salt + rw.salt + (whereSame ? 20 : 0))),
              azoth: Math.min(MAX_AZOTH, Math.max(0, prev.resources.azoth - s.cost.azoth + rw.azoth + (whenSame ? 4 : 0))),
            },
            ingredients: [],
            log: [...prev.log.slice(-29), { success: true, stage: prev.stage, ingredients: prev.ingredients.map(i => i.name), result: rb, time: timeStr }],
            discoveredFormulas: (() => { const formula = `${a}⊕${b}⊕${c}=${rb}`; const existing = Array.isArray(prev.discoveredFormulas) ? prev.discoveredFormulas : []; return existing.includes(formula) ? existing : [...existing, formula]; })(),
          };
          if (resLabel) setToast({ icon: "🎵", name: "Резонанс!", msg: resLabel, fx: {} });
          // Positive incident (25% chance)
          if (Math.random() < .25) { const pi = POS_INC[Math.floor(Math.random() * POS_INC.length)]; setToast(pi); if (pi.effect) setTimeout(() => setScreenEffect(pi.effect), 200); }
          return applyAchievements(n);
        });
        sfx("success"); setModal({ success: true, rb, resonanceLabel: resLabel });
      } else {
        setReacting(false);
        const inc = NEG_INC[Math.floor(Math.random() * NEG_INC.length)];
        sfx("negInc"); setShaking(true); setFailShake(true);
        setTimeout(() => { setShaking(false); setFailShake(false); }, 600);

        upGs(prev => {
          const penalty = Math.floor(Math.random() * 8) + 2;
          const newScar = inc.scar ? { text: inc.scar, icon: inc.icon, stage: prev.stage, x: Math.random() * 70 + 10, y: Math.random() * 55 + 15, id: Date.now() } : null;
          const scars = newScar ? [...(prev.scars || []).slice(-4), newScar] : prev.scars || [];
          if (inc.effect) setTimeout(() => setScreenEffect(inc.effect), 80);
          let n = {
            ...prev,
            experiments: prev.experiments + 1,
            maxHeat: Math.max(prev.maxHeat, prev.heat),
            failures: prev.failures + 1,
            streak: 0,
            stageFails: prev.stageFails + 1,
            scars,
            purity: Math.max(0, prev.purity + (inc.fx.purity || 0)),
            resources: {
              mercury: Math.max(0, prev.resources.mercury - s.cost.mercury + (inc.fx.mercury || 0) - penalty),
              sulfur: Math.max(0, prev.resources.sulfur - s.cost.sulfur + (inc.fx.sulfur || 0) - penalty),
              salt: Math.max(0, prev.resources.salt - s.cost.salt + (inc.fx.salt || 0) - penalty),
              azoth: Math.max(0, prev.resources.azoth - s.cost.azoth),
            },
            ingredients: [],
            log: [...prev.log.slice(-29), { success: false, stage: prev.stage, ingredients: prev.ingredients.map(i => i.name), result: rb, time: timeStr }],
          };
          setToast(inc);
          return applyAchievements(n);
        });
        sfx("fail");
        const resShort = {
          mercury: res.mercury < s.cost.mercury,
          sulfur: res.sulfur < s.cost.sulfur,
          salt: res.salt < s.cost.salt,
          azoth: res.azoth < s.cost.azoth,
        };
        const hasResShort = Object.values(resShort).some(Boolean);
        setModal({ success: false, rb: null, failInfo: { ingOk, heatOk, heatMin: s.heatMin, heatMax: s.heatMax, resShort: hasResShort ? resShort : null } });
      }
    } catch (err) { console.error("doReaction error:", err); } finally { setBusy(false); }
  };

  const advanceStage = () => { setBusy(false); setModal(null); if (gs.stage >= TOTAL) { setScreen("victory"); save("victory", gs); return; } setNarrative(gs.stage); };
  const continueAfterNarrative = () => {
    setNarrative(null); sfx("success");
    const prevSeason = STAGE_SEASON[(gs.stage - 1) % STAGE_SEASON.length];
    const nextSeason = STAGE_SEASON[gs.stage % STAGE_SEASON.length];
    if (sound) { Music.stopBackground(); Music.playTransition(prevSeason, nextSeason); setTimeout(() => { if (sound) Music.startBackground(nextSeason); }, 2400); }
    upGs(prev => ({ ...prev, stage: prev.stage + 1, ingredients: [], stageFails: 0, grimoireOpened: false }));
  };

  const resShort = useMemo(() => gs.resources.mercury < stage.cost.mercury || gs.resources.sulfur < stage.cost.sulfur || gs.resources.salt < stage.cost.salt || gs.resources.azoth < stage.cost.azoth, [gs.resources, stage.cost]);
  const preview = useMemo(() => {
    if (gs.ingredients.length !== 3) return null;
    const bin = transmute(gs.ingredients[0].bin, gs.ingredients[1].bin, gs.ingredients[2].bin);
    return { bin, arch: ga(bin) };
  }, [gs.ingredients]);

  if (screen === "intro") return (<><style>{CSS}</style><IntroScreen onStart={() => setScreen("tutorial")} onSkipTutorial={() => { upGs(p => ({ ...p, tutorialDone: true })); setScreen("game"); }} onOpenAcademy={() => setPanel("academy")} />{panel === "academy" && <AcademyPanel gs={gs} onClose={() => setPanel(null)} onUpdateGs={upGs} />}</>);
  if (screen === "tutorial") return (<><style>{CSS}</style><Tutorial onDone={() => { upGs(p => ({ ...p, tutorialDone: true })); setScreen("game"); }} />{panel === "academy" && <AcademyPanel gs={gs} onClose={() => setPanel(null)} onUpdateGs={upGs} />}</>);
  if (screen === "victory") return (<><style>{CSS}</style><VictoryScreen gs={gs} onRestart={() => { const n = initGs(); dispatchGs({ type: "RESET", payload: n }); setScreen("intro"); save("intro", n); }} onNewGamePlus={() => { const n = initNgPlus(gs); dispatchGs({ type: "RESET", payload: n }); setUndoStack([]); setScreen("game"); save("game", n); }} onOpenAcademy={() => setPanel("academy")} />{panel === "academy" && <AcademyPanel gs={gs} onClose={() => setPanel(null)} onUpdateGs={upGs} />}</>);

  const heatPct = gs.heat / MAX_HEAT; const heatCol = heatPct > .75 ? "#f05050" : heatPct > .45 ? "#f09030" : "#d4860e";
  const stageCol = stage.ac;
  const masterHint = gs.stageFails >= 2 ? stage.masterHints[Math.min(gs.stageFails - 2, stage.masterHints.length - 1)] : null;
  const wisdom = gs.stageFails >= 3 ? WISDOMS[gs.experiments % WISDOMS.length] : null;
  // Grimoire is urgent if 2+ fails AND hasn't been opened this stage
  const grimUrgent = gs.stageFails >= 2 && !gs.grimoireOpened;

  return (<div style={{ width: "100%", height: "100dvh", background: "#040300", color: "#c09040", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Georgia','Times New Roman',serif", WebkitFontSmoothing: "antialiased", animation: shaking ? "shake .5s ease" : "none" }}>
    <style>{CSS + ALL_ARCH_KEYFRAMES}</style>
    {/* STAGE AMBIENT BACKGROUND */}
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: ambient.bg, opacity: .65, transition: "background 1.5s" }} />
      <div style={{ position: "absolute", width: "70vw", height: "70vw", borderRadius: "50%", background: `radial-gradient(${ambient.glow}12,transparent 65%)`, top: "-22vw", left: "15vw", transition: "background 1.2s", animation: "drift 14s ease-in-out infinite", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", width: "40vw", height: "40vw", borderRadius: "50%", background: `radial-gradient(${ambient.particle}09,transparent 65%)`, bottom: "10%", right: "-10%", animation: "drift 20s ease-in-out 4s infinite reverse", filter: "blur(30px)" }} />
      <div style={{ position: "absolute", width: "30vw", height: "30vw", borderRadius: "50%", background: `radial-gradient(${ambient.glow}06,transparent 65%)`, top: "40%", left: "-8%", animation: "drift 28s ease-in-out 8s infinite", filter: "blur(24px)" }} />
      {gs.scars.map(sc => (<div key={sc.id || sc.text} style={{ position: "absolute", left: `${sc.x || 15}%`, top: `${sc.y || 50}%`, fontSize: 18, opacity: .14, filter: "blur(1.5px) grayscale(.7)", pointerEvents: "none", animation: `scarSmolder ${2.5 + ((sc.id || 0) % 3)}s ease-in-out ${(sc.id || 0) % 2}s infinite`, zIndex: 1, transform: "rotate(-8deg)" }}>{sc.icon}</div>))}
    </div>

    {/* HEADER */}
    <div style={{ background: "rgba(4,3,0,.98)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${stageCol}28`, flexShrink: 0, zIndex: 50, backgroundImage: `radial-gradient(ellipse at 50% -20%,${stageCol}07,transparent 55%)` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px" }}>
        {/* Stage badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: `radial-gradient(circle at 38% 38%,${stageCol}77,${stageCol}18)`, border: `1.5px solid ${stageCol}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: `0 0 14px ${stageCol}33` }}>{stage.sym}</div>
          <div>
            <div style={{ fontSize: 9.5, color: stageCol, letterSpacing: 2, fontFamily: "monospace", textTransform: "uppercase", fontWeight: 700, display: "flex", gap: 5, alignItems: "center" }}>Діяння · {gs.stage}/10{gs.ngPlus > 0 && <span style={{ background: "#e8c04022", border: "1px solid #e8c04066", borderRadius: 4, padding: "0 4px", fontSize: 9, color: "#e8c040", letterSpacing: 1 }}>NG+{gs.ngPlus}</span>}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#e8c050", lineHeight: 1.1, fontFamily: "Georgia,serif" }}>{stage.name}</div>
          </div>
        </div>

        {/* Alchemist Cycle widget */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 6px" }}>
          <AlchemistCycle step={cycleStep} stageCol={stageCol} />
        </div>

        {/* Right buttons */}
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <MusicIndicator sound={sound} />
          <button aria-label={sound ? "Вимкнути звук" : "Увімкнути звук"} onClick={() => { const ns = !sound; setSound(ns); Music.setEnabled(ns); if (ns) { const season = STAGE_SEASON[(gs.stage - 1) % STAGE_SEASON.length]; Music.startBackground(season); } }} style={{ background: "#0c0903", border: "1px solid #1e1408", borderRadius: 7, color: sound ? "#b87838" : "#3a2808", padding: "5px 6px", cursor: "pointer", fontSize: 11 }}>{sound ? "🔊" : "🔇"}</button>
          {sound && <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => { const v = parseFloat(e.target.value); setVolume(v); Music.setVolume(v); }} aria-label="Гучність музики" title={`Гучність: ${Math.round(volume * 100)}%`} style={{ width: 44, accentColor: "#c8900a", cursor: "pointer", verticalAlign: "middle" }} />}
          <button aria-label={`Досягнення (${gs.earned.length} отримано)`} onClick={() => setPanel("achievements")} style={{ background: "#0c0903", border: `1px solid ${gs.earned.length ? "#b8870a44" : "#1e1408"}`, borderRadius: 7, color: gs.earned.length ? "#b8870a" : "#7a4820", padding: "5px 6px", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", gap: 1 }}>🏆<span style={{ fontSize: 10.5, fontFamily: "monospace" }}>{gs.earned.length}</span></button>
          <button aria-label="Кодекс Розенкрейцера" onClick={() => setCodexOpen(true)} style={{ background: "#0c0903", border: "1px solid #c8900a44", borderRadius: 7, color: "#c8900a", padding: "5px 6px", cursor: "pointer", fontSize: 11 }}>🌹</button>
          <button aria-label="Академія алхіміків" onClick={() => setPanel("academy")} style={{ background: "#0c0903", border: "1px solid #7dcfff33", borderRadius: 7, color: "#7dcfff", padding: "5px 6px", cursor: "pointer", fontSize: 11 }}>🏛</button>
          <button aria-label="Мова архетипів" onClick={() => setLegendOpen(true)} title="Мова архетипів" style={{ background: "#0c0903", border: "1px solid #4ade8033", borderRadius: 7, color: "#4ade80", padding: "5px 6px", cursor: "pointer", fontSize: 11 }}>🔍</button>
          {/* Grimoire — urgent glow when 2+ fails and not yet opened */}
          <button aria-label={grimUrgent ? "Грімуар (важливо!)" : "Грімуар"} onClick={() => { upGs(p => ({ ...p, grimoireOpened: true })); setPanel("grimoire"); }} style={{ background: grimUrgent ? "linear-gradient(135deg,#2a1a00,#1a1000)" : "#0c0903", border: `1.5px solid ${grimUrgent ? "#e8c040" : stageCol + "66"}`, borderRadius: 7, color: grimUrgent ? "#e8c040" : stageCol, padding: "5px 8px", cursor: "pointer", fontSize: 12, position: "relative", boxShadow: grimUrgent ? "0 0 12px #e8c04055" : "none" }}>
            📜
            {(!gs.grimoireOpened || grimUrgent) && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#e8c040", boxShadow: "0 0 6px #e8c040", animation: "pulse 2s ease-in-out infinite" }} />}
          </button>
        </div>
      </div>

      {/* Stage progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 3.5, paddingBottom: saveError ? 3 : 7 }}>
        {STAGES.map(s => (<div key={s.id} style={{ height: 4, borderRadius: 2, transition: "all .4s", width: s.id === gs.stage ? 18 : 4, background: s.id < gs.stage ? s.ac : s.id === gs.stage ? stageCol : "#2a1c08", boxShadow: s.id === gs.stage ? `0 0 8px ${stageCol}` : "" }} />))}
      </div>
      {saveError && <div style={{ textAlign: "center", fontSize: 9.5, color: "#f07070", fontFamily: "monospace", paddingBottom: 4, letterSpacing: .5 }}>{saveError}</div>}
    </div>

    {/* SCROLL AREA */}
    <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", position: "relative", zIndex: 1 }}>
      <div style={{ padding: "10px 11px 0" }}>

        {/* RESOURCES */}
        <div style={{ background: "linear-gradient(145deg,#0e0b04,#09080200)", border: "1px solid #1c1408", borderRadius: 14, padding: "9px 11px", marginBottom: 8, boxShadow: "inset 0 0 22px rgba(0,0,0,.45)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 12px", marginBottom: 5 }}>
            {[["☿", "mercury", "#7dcfff", 250], ["🔥", "sulfur", "#e06060", 250], ["🧂", "salt", "#a8a898", 250], ["💧", "azoth", "#c084fc", 80]].map(([ic, key, col, max]) => { const val = gs.resources[key]; const pct = Math.min(100, val / max * 100); const low = pct < 20; return (<div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11.5, flexShrink: 0 }}>{ic}</span><div style={{ flex: 1, height: 6, background: "#1a1006", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: low ? "#e05050" : col, borderRadius: 2, transition: "width .4s", boxShadow: pct > 5 ? `0 0 5px ${low ? "#e05050" : col}55` : "none" }} /></div><span style={{ fontSize: 11.5, color: low ? "#e05050" : col, minWidth: 20, textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{val}</span></div>); })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 5, borderTop: "1px solid #1a1206" }}>
            <span style={{ fontSize: 11, color: "#aa7030", letterSpacing: 1.5, flexShrink: 0, fontFamily: "monospace" }}>ЧИСТОТА</span>
            <div style={{ flex: 1, height: 6, background: "#1a1006", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${gs.purity}%`, height: "100%", background: `linear-gradient(to right,${gs.purity > 60 ? "#c09828" : "#c04820"},#e8c040)`, borderRadius: 2, transition: "width .5s" }} /></div>
            <span style={{ fontSize: 11.5, color: gs.purity > 60 ? "#c09828" : "#c04820", fontFamily: "monospace", flexShrink: 0, fontWeight: 700 }}>✦{gs.purity}%</span>
          </div>
          {resShort ? (<button onClick={() => { sfx("click"); setPanel("recovery"); }} style={{ marginTop: 7, width: "100%", background: "rgba(200,140,10,.1)", border: "1px solid #e8a030", borderRadius: 8, padding: "6px 9px", cursor: "pointer", animation: "pulse 2.2s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}><span style={{ fontSize: 11.5, color: "#e8a018" }}>⚠ Недостатньо ресурсів</span><span style={{ fontSize: 12, color: "#c08020", background: "#1a1000", borderRadius: 5, padding: "2px 8px", border: "1px solid #d4900022", fontFamily: "Georgia,serif" }}>Лабораторний стіл →</span></button>) : (<button onClick={() => { sfx("click"); setPanel("recovery"); }} style={{ marginTop: 6, width: "100%", background: "transparent", border: "1px solid #1c1208", borderRadius: 7, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, opacity: .38 }}><span style={{ fontSize: 11.5, color: "#d4a050" }}>⚗ Лабораторний стіл</span></button>)}
        </div>

        {masterHint && (<div style={{ background: "linear-gradient(135deg,#1e1a08,#141004)", border: "1px solid #c8a030", borderRadius: 13, padding: "10px 12px", marginBottom: 8, animation: "slideDown .35s ease" }}><div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "#201608", border: "1px solid #b8870a55", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📜</div><div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#e8c040", letterSpacing: 1.5, marginBottom: 3, fontWeight: 700 }}>МАЙСТЕР ШЕПОЧЕ</div><div style={{ fontSize: 11.5, color: "#c09040", fontStyle: "italic", lineHeight: 1.6, fontFamily: "Georgia,serif" }}>{masterHint}</div>{wisdom && <div style={{ marginTop: 6, paddingTop: 5, borderTop: "1px solid #201608", fontSize: 10, color: "#b87838", fontStyle: "italic", lineHeight: 1.5 }}>{wisdom}</div>}</div></div></div>)}

        {/* ATHANOR */}
        <div style={{ background: `linear-gradient(155deg,${stage.bg},#060401)`, border: `1px solid ${heatCol}33`, borderRadius: 14, padding: "11px 12px", marginBottom: 8, boxShadow: `0 0 22px ${heatCol}10,inset 0 0 22px rgba(0,0,0,.5)`, transition: "border-color .5s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <div style={{ fontSize: 11.5, color: heatCol, letterSpacing: 2, fontFamily: "monospace" }}>🔥 АТАНОР</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {reacting && <div style={{ fontSize: 11, color: stageCol, animation: "pulse 1s ease-in-out infinite", letterSpacing: 1 }}>РЕАКЦІЯ</div>}
              <div style={{ fontSize: 11, color: "#8a5830" }}>{stage.heatMin}°–{stage.heatMax}°</div>
              <div style={{ fontFamily: "monospace", fontSize: 14, color: heatCol, fontWeight: 700, textShadow: `0 0 12px ${heatCol}99` }}>{gs.heat}°</div>
            </div>
          </div>
          <Flame heat={gs.heat} />
          <div style={{ position: "relative", marginTop: 7 }}>
            <div style={{ height: 5, background: "#160e04", borderRadius: 3, position: "relative", overflow: "visible" }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${stage.heatMin / MAX_HEAT * 100}%`, width: `${(stage.heatMax - stage.heatMin) / MAX_HEAT * 100}%`, background: `${stageCol}28`, borderRadius: 3, border: `1px solid ${stageCol}30` }} />
              <div style={{ width: `${gs.heat / MAX_HEAT * 100}%`, height: "100%", background: heatCol, borderRadius: 3, transition: "width .12s", boxShadow: `0 0 6px ${heatCol}66` }} />
            </div>
            <input type="range" min="0" max={MAX_HEAT} value={gs.heat} disabled={busy} onChange={e => { sfx("heat"); const h = Number(e.target.value); Music.setHeat(h); upGs(p => ({ ...p, heat: h, maxHeat: Math.max(p.maxHeat, h) })); }} style={{ position: "absolute", top: -5, left: 0, right: 0, width: "100%", opacity: 0, height: 22, cursor: busy ? "default" : "pointer" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#c08030", marginTop: 3, fontFamily: "monospace" }}>
            <span>❄ 0°</span><span style={{ color: inZone ? stageCol : "#6a4010", fontWeight: 700, transition: "color .3s" }}>{inZone ? "✦ В ЗОНІ" : "× поза зоною"}</span><span>∞ 777°</span>
          </div>
        </div>

        <StageContext stage={stage} />
        <InspirationPanel ingredients={gs.ingredients} stage={stage} />

        {/* VESSELS */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 10.5, color: "#8a5830", letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace" }}>РЕАКЦІЙНІ ПОСУДИНИ</div>
            {hasRes && <div style={{ fontSize: 11, color: "#e8c040", background: "#1e1600", borderRadius: 6, padding: "3px 10px", border: "1px solid #c89030", fontWeight: 700, animation: "pulse 1.5s ease-in-out infinite" }}>🎵 {whoRes ? "WHO" : whereRes ? "WHERE" : "WHEN"} РЕЗОНАНС</div>}
          </div>
          <div style={{ display: "flex", gap: 5, justifyContent: "space-between" }}>
            {[0, 1, 2].map(i => (<Vessel key={i} arch={gs.ingredients[i] || null} slot={["I", "II", "III"][i]} slotIdx={i} totalFilled={gs.ingredients.length} onRemove={() => removeIngredient(i)} reacting={reacting} failShake={failShake} resonance={hasRes && !!gs.ingredients[i]} />))}
          </div>
          {undoStack.length > 0 && gs.ingredients.length > 0 && (
            <div style={{ textAlign: "right", marginTop: 4 }}>
              <button onClick={doUndo} disabled={busy} title="Скасувати останню зміну" aria-label="Скасувати" style={{ background: "none", border: "none", color: "#7a5828", cursor: "pointer", fontSize: 11, fontFamily: "monospace", padding: "2px 4px", opacity: busy ? .4 : 1 }}>↩ скасувати</button>
            </div>
          )}
        </div>

        {/* XOR preview */}
        {gs.ingredients.length > 0 && (<div style={{ background: "#0c0904", border: "1px solid #1c1208", borderRadius: 10, padding: "6px 11px", marginBottom: 8, fontFamily: "monospace", fontSize: 10.5, color: "#a87840", display: "flex", gap: 3.5, flexWrap: "wrap", alignItems: "center" }}>
          {gs.ingredients.map((a, i) => (<span key={i} style={{ display: "flex", alignItems: "center", gap: 2.5 }}><span style={{ color: ac(a.who, a.where, a.when), fontWeight: 700 }}>{a.bin}</span>{i < gs.ingredients.length - 1 && <span style={{ color: "#b87830", fontWeight: 700 }}>⊕</span>}</span>))}
          {preview && (<><span style={{ color: "#b87830", fontWeight: 700 }}>=</span><span style={{ color: ac(preview.arch.who, preview.arch.where, preview.arch.when), fontWeight: 700 }}>{preview.bin}</span><span style={{ width: 8, height: 8, borderRadius: "50%", background: ac(preview.arch.who, preview.arch.where, preview.arch.when), display: "inline-block", flexShrink: 0 }} /><span style={{ color: ac(preview.arch.who, preview.arch.where, preview.arch.when), fontFamily: "Georgia,serif", fontSize: 12 }}>{preview.arch.name}</span></>)}
        </div>)}

        {/* REACTION BUTTON — enhanced pulse when ready */}
        <button onClick={doReaction} disabled={!canTransmute} style={{
          width: "100%",
          background: canTransmute ? `linear-gradient(135deg,${stageCol}55,${stageCol}22)` : "#0e0c06",
          border: `1.5px solid ${canTransmute ? stageCol + "88" : "#5a3820"}`,
          borderRadius: 14, padding: "15px", cursor: canTransmute ? "pointer" : "default",
          fontSize: 14.5, color: canTransmute ? stageCol : "#7a4820",
          fontFamily: "Georgia,serif", letterSpacing: .5,
          "--gc": stageCol,
          boxShadow: canTransmute ? `0 0 28px ${stageCol}33,inset 0 0 20px ${stageCol}0a` : "none",
          animation: canTransmute && !busy ? "readyGlow 1.8s ease-in-out infinite" : "none",
          transition: "all .22s", marginBottom: 9,
        }}>
          {busy ? (<span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><span style={{ width: 13, height: 13, border: `1.5px solid ${stageCol}33`, borderTop: `1.5px solid ${stageCol}`, borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} /> Реакція відбувається...</span>) : (<span>⚡ ПРОВЕСТИ РЕАКЦІЮ{canTransmute && <span style={{ fontSize: 10, opacity: .6, marginLeft: 8, letterSpacing: 2 }}>· ГОТОВО</span>}</span>)}
        </button>

        {/* SCARS — visual burn marks */}
        {gs.scars && gs.scars.length > 0 && (<div style={{ marginBottom: 9, padding: "8px 10px", background: "linear-gradient(135deg,#120806,#0e0604)", borderRadius: 10, border: "1px solid #3a1808", position: "relative", overflow: "hidden" }}>
          {gs.scars.slice(-3).map((sc, i) => (<div key={i} style={{ position: "absolute", width: 40 + i * 20, height: 40 + i * 20, borderRadius: "50%", background: `radial-gradient(circle,#5a200888,transparent 65%)`, top: `${10 + i * 25}%`, left: `${60 + i * 10}%`, animation: `scarSmolder ${3 + i}s ease-in-out ${i * .5}s infinite`, pointerEvents: "none" }} />))}
          <div style={{ fontSize: 10, color: "#7a3010", letterSpacing: 2, fontFamily: "monospace", marginBottom: 6, fontWeight: 600, position: "relative" }}>⚠ СЛІДИ В ЛАБОРАТОРІЇ</div>
          {gs.scars.slice(-2).map((sc, i) => (<div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: i < gs.scars.slice(-2).length - 1 ? 5 : 0, position: "relative" }}><span style={{ fontSize: 13, flexShrink: 0 }}>{sc.icon}</span><div style={{ fontSize: 11, color: "#a05028", fontStyle: "italic", lineHeight: 1.45, fontFamily: "Georgia,serif" }}>{sc.text}</div></div>))}
        </div>)}

        <DeductivePanel stageIdx={gs.stage} ingredients={gs.ingredients} onAdd={addIngredient} onRemove={removeIngredient} busy={busy} stageCol={stageCol} />

        <div style={{ background: "#0c0904", border: "1px solid #1c1208", borderRadius: 10, padding: "7px 10px", marginBottom: 10, display: "flex", justifyContent: "space-around", fontSize: 11.5, color: "#8a5830", fontFamily: "monospace" }}>
          {[["⚗", gs.experiments, "Спроби"], ["✓", gs.successes, "Успіхи"], ["✗", gs.failures, "Невдачі"], ["🔥", gs.streak, "Серія"], ["🎵", gs.resonances || 0, "Резон."]].map(([ic, v, lb]) => (<div key={lb} style={{ textAlign: "center" }}><div style={{ fontSize: 12 }}>{ic}</div><div style={{ color: "#b8870a", fontWeight: 700, fontSize: 12, lineHeight: 1.2 }}>{v}</div><div style={{ fontSize: 10.5, letterSpacing: .5, marginTop: 1 }}>{lb.toUpperCase()}</div></div>))}
        </div>
      </div>
      <div style={{ height: 14 }} />
    </div>

    {/* OVERLAYS — кожен рендериться рівно один раз */}
    {contextHint && <ContextHint hint={contextHint} onDone={() => setContextHint(null)} />}
    {codexOpen && <CodexPanel onClose={() => setCodexOpen(false)} />}
    {legendOpen && <ArchLegend onClose={() => setLegendOpen(false)} />}
    {narrative && <NarrativeModal stageIdx={narrative} onContinue={continueAfterNarrative} />}
    {transAnim && <TransAnim color={transAnim} onDone={() => setTransAnim(null)} />}
    {panel === "grimoire" && <Grimoire stage={gs.stage} gs={gs} onClose={() => setPanel(null)} />}
    {panel === "achievements" && <AchPanel gs={gs} onClose={() => setPanel(null)} />}
    {panel === "recovery" && <RecoveryPanel gs={gs} onAction={next => { upGs(() => next); }} onClose={() => setPanel(null)} />}
    {panel === "academy" && <AcademyPanel gs={gs} onClose={() => setPanel(null)} onUpdateGs={upGs} />}
    {modal && <ResultModal success={modal.success} stageIdx={gs.stage} resultBin={modal.rb || stage.result} failInfo={modal.failInfo} resonanceLabel={modal.resonanceLabel} onNext={advanceStage} onRetry={() => setModal(null)} />}
    {toast && <Toast inc={toast} onDone={() => setToast(null)} />}
    {achPop && <AchPop ach={achPop} onDone={() => setAchPop(null)} />}
    {screenEffect && <ScreenEffect effect={screenEffect} onComplete={() => setScreenEffect(null)} />}
  </div>);
}

export default Game;
