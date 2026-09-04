'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Game, DT, FPS, swept } = require('./core.js');
const { Sound, SPECS, synthesize } = require('./audio.js');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS', name); }
function active(stage = 1) { const g = new Game(1980); g.start(stage, true); g.mode = 'playing'; g.player.inv = 0; return g; }
function ticks(g, n, input = {}) { for (let i = 0; i < n; i++) { g.step(input); g.drainEvents(); } }

test('Five phases have the correct families and counts', () => {
  for (let stage = 1; stage <= 5; stage++) {
    const g = active(stage);
    assert.equal(g.enemies.length, stage <= 2 ? 16 : stage <= 4 ? 8 : 6);
    if (stage === 3 || stage === 4) { assert(g.enemies.every(e => e.kind === 'egg')); assert.equal(g.enemies[0].color, stage === 3 ? 'blue' : 'pink'); }
    assert.equal(!!g.boss, stage === 5);
  }
});
test('Movement, limits, shield immobilization, firing and cooldown', () => {
  const g = active(); g.player.inv = 999;
  ticks(g, 70, { right: true }); assert.equal(g.player.x, 200);
  ticks(g, 160, { left: true }); assert.equal(g.player.x, 8);
  g.step({ shield: true, right: true }); const x = g.player.x;
  assert(g.player.shield > 0); g.shots = [];
  assert(g.fire(), 'Shield still permits firing');
  ticks(g, 20, { right: true, shield: true }); assert.equal(g.player.x, x);
  ticks(g, 70); assert(g.player.reload > 4.8 && g.player.reload <= 5);
  g.step({ shield: true }); assert.equal(g.player.shield, 0);
  ticks(g, 310); g.step({ shield: true }); assert(g.player.shield > 0);
});
test('Single shot and second-wave double shot limits', () => {
  const g = active(); assert(g.fire()); assert(!g.fire());
  g.stage = 2; assert(g.fire()); assert(!g.fire()); assert.equal(g.shots.length, 2);
});
test('Player shots move eight pixels per simulation update in every phase', () => {
  for (let stage = 1; stage <= 5; stage++) {
    const g = active(stage); g.enemies = []; g.boss = null;
    assert(g.fire()); const y = g.shots[0].y;
    g.updateShots(); assert.equal(g.shots[0].y, y - 8);
  }
});
test('Missed shots rearm after 24 updates; second phase fills two slots', () => {
  for (let stage = 1; stage <= 5; stage++) {
    const g = active(stage); g.enemies = []; g.boss = null;
    const fired = [];
    for (let tick = 0; tick < 100; tick++) {
      if (g.fire()) fired.push(tick);
      assert(g.shots.length <= (stage === 2 ? 2 : 1));
      g.updateShots(); g.drainEvents();
    }
    assert.deepEqual(fired.slice(0, 4), stage === 2 ? [0, 1, 24, 25] : [0, 24, 48, 72]);
    assert(Math.abs(24 * DT - .393216) < 1e-9);
  }
});
test('A close impact permits firing on the next update without an extra delay', () => {
  const g = active(); g.player.inv = 999;
  g.updateEnemies = () => {}; // stationary target isolates firing from enemy AI
  const target = g.enemies[0]; Object.assign(target, { x: g.player.x, y: 207 });
  g.drainEvents(); g.step({ fire: true });
  assert(target.dead);
  assert.equal(g.shots.length, 0);
  assert(g.drainEvents().some(e => e.name === 'shoot'));
  g.step({ fire: true });
  assert.equal(g.shots.length, 1);
  assert(g.drainEvents().some(e => e.name === 'shoot'));
});
test('Swept projectile collision and score (including a very fast shot)', () => {
  assert(swept({ x: 20, y: 0, prevY: 250, w: 1, h: 5 }, { x: 20, y: 80, w: 14, h: 12 }));
  const g = active(), e = g.enemies[0]; e.x = 104; e.y = 160;
  g.shots = [{ x: 104, y: 210, prevY: 210, w: 1, h: 5, vy: -16000 }];
  g.updateShots(); assert(e.dead); assert(g.score > 0); assert.equal(g.shots.length, 0);
});
test('Eggs hatch; wing loss regenerates; center hit is lethal', () => {
  const g = active(3); g.player.inv = 999;
  for (const e of g.enemies) { e.mode = 'formation'; e.y = e.homeY; }
  ticks(g, 200); assert(g.enemies.every(e => e.kind === 'large'));
  const e = g.enemies[0], score = g.score; g.hitEnemy(e, e.x - 12);
  assert(e.leftWing > 0 && !e.dead); assert.equal(g.score, score);
  for (let i = 0; i < 180; i++) g.updateEnemies();
  assert.equal(e.leftWing, 0); g.hitEnemy(e, e.x); assert(e.dead); assert(g.score > score);
});
test('Shots pass through a missing wing without being consumed', () => {
  const g = active(3); const e = g.enemies[0];
  Object.assign(e, { kind: 'large', x: 104, y: 100, w: 40, h: 18, leftWing: 2 }); g.enemies = [e];
  g.shots = [{ x: 92, y: 107, prevY: 107, w: 1, h: 5, vy: -8 * FPS }];
  g.updateShots(); assert.equal(g.shots.length, 1); assert(!e.dead);
});
test('Armor erodes before belt and pilot; victory advances to next round', () => {
  const g = active(5); g.enemies = [];
  const shot = { x: 104, y: 40, prevY: 240, w: 1, h: 5 };
  for (let i = 0; i < 8; i++) { const hit = g.bossContact(shot); assert.equal(hit.type, 'armor'); g.damageBoss(hit); }
  let hit = g.bossContact(shot); assert.equal(hit.type, 'belt'); g.damageBoss(hit);
  hit = g.bossContact(shot); assert.equal(hit.type, 'core'); g.damageBoss(hit);
  assert.equal(g.boss, null); assert.equal(g.mode, 'clear'); assert(g.score >= 1000);
  ticks(g, 150); assert.equal(g.round, 2); assert.equal(g.stage, 1); assert.equal(g.enemies.length, 16);
});
test('All four bird waves can transition without leftover projectiles blocking them', () => {
  for (let stage = 1; stage <= 4; stage++) {
    const g = active(stage); for (const e of g.enemies) g.kill(e, 20); g.step({ fire: true });
    assert.equal(g.mode, 'clear'); ticks(g, 90); assert.equal(g.stage, stage + 1);
  }
});
test('Missiles, shield contact, one life per hit, game-over and reset', () => {
  const g = active();
  const missile = () => ({ x: g.player.x, y: g.player.y - 1, prevY: g.player.y - 1, w: 2, h: 4, vx: 0, vy: 100 });
  g.missiles = [missile(), missile(), missile()]; g.updateMissiles(); assert.equal(g.lives, 2); assert.equal(g.mode, 'dying');
  ticks(g, 75); assert.equal(g.mode, 'ready'); assert(g.player.inv > 0);
  for (let i = 0; i < 2; i++) { g.mode = 'playing'; g.player.inv = 0; g.hitPlayer(); ticks(g, 75); }
  assert.equal(g.mode, 'gameover'); g.start(); assert.equal(g.lives, 3); assert.equal(g.score, 0);
  g.mode = 'playing'; g.player.inv = 0; g.player.shield = 1; g.missiles = [missile()]; g.updateMissiles(); assert.equal(g.lives, 3);
  const e = g.enemies[0]; e.mode = 'formation'; e.homeX = g.player.x; e.homeY = g.player.y; e.x = g.player.x; e.y = g.player.y;
  g.step(); assert(e.dead, 'Shield contact destroys a bird');
});
test('Pause freezes simulation; long frame recovery is capped', () => {
  const g = active(); g.pause(true); const time = g.time, x = g.player.x;
  g.advance(100, { right: true, fire: true }); assert.equal(g.time, time); assert.equal(g.player.x, x);
  g.pause(false); g.advance(100); assert(g.time - time <= .2 + DT);
});
test('30 / 60 / 144 Hz presentation gives identical simulation', () => {
  const results = [];
  for (const hz of [30, 60, 144]) {
    const g = active(); for (let i = 0; i < hz * 60; i++) { g.advance(1 / hz, { right: true, fire: true }); g.drainEvents(); }
    results.push(JSON.stringify({ ticks: g.ticks, score: g.score, lives: g.lives, x: g.player.x, enemies: g.enemies, mode: g.mode }));
  }
  assert.equal(results[0], results[1]); assert.equal(results[1], results[2]);
});
test('Bonus lives awarded once and practice never changes high score', () => {
  const g = active(); g.high = 99; g.addScore(3100); assert.equal(g.lives, 4); g.addScore(1); assert.equal(g.lives, 4); assert.equal(g.high, 99);
  g.start(); g.addScore(30000); assert.equal(g.lives, 5); assert.equal(g.high, 30000);
});
test('Seeded endurance: 25 simulated minutes across all starting phases', () => {
  for (let stage = 1; stage <= 5; stage++) {
    const g = active(stage); g.player.inv = 1e6;
    for (let i = 0; i < Math.ceil(300 * FPS); i++) {
      const target = g.boss?.x ?? g.enemies.filter(e => !e.dead).sort((a,b) => b.y-a.y)[0]?.x ?? 104;
      g.step({ fire: true, left: target < g.player.x - 1, right: target > g.player.x + 1 }); g.drainEvents();
      if (g.mode === 'ready') g.player.inv = 1e6; // explicitly invulnerable stress harness, not a difficulty test
      if (g.mode === 'gameover') throw new Error('Unexpected death in stress harness');
      assert(Number.isFinite(g.player.x)); assert(g.enemies.length <= 16); assert(g.missiles.length <= 12); assert(g.shots.length <= 2); assert(g.effects.length < 100);
      for (const e of [...g.enemies, ...g.shots, ...g.missiles]) assert(Number.isFinite(e.x) && Number.isFinite(e.y));
    }
    console.log('  endurance start phase',stage,'ended at round',g.round,'phase',g.stage,'score',g.score);
  }
});
test('Audio signals: finite, nonempty, bounded, repeatable at 44.1 / 48 kHz', () => {
  for (const rate of [44100, 48000]) for (const name of Object.keys(SPECS)) {
    const data = synthesize(name, rate); let power = 0, peak = 0;
    for (const v of data) { assert(Number.isFinite(v)); peak = Math.max(peak, Math.abs(v)); power += v*v; }
    assert(peak <= .85 + 1e-6 && peak > .01); assert(power / data.length > .000001);
    assert.equal(data.length, Math.ceil(rate * SPECS[name].duration)); assert(data[0] === 0);
    assert.deepEqual(data, synthesize(name, rate));
  }
});
class FakeParam { setValueAtTime(v) { this.value = v; } setTargetAtTime(v) { this.value = v; } cancelScheduledValues() {} }
class FakeNode { constructor() { this.gain = new FakeParam(); this.frequency = new FakeParam(); } connect() {} disconnect() {} start() {} stop() { this.stopped = true; } }
class FakeContext {
  constructor() { this.state = 'running'; this.sampleRate = 44100; this.currentTime = 0; this.destination = {}; }
  createGain() { return new FakeNode(); } createBiquadFilter() { return new FakeNode(); } createBufferSource() { return new FakeNode(); }
  createBuffer(ch,n) { const arr = new Float32Array(n); return { getChannelData() { return arr; } }; }
  async resume() { this.state = 'running'; }
}
test('Audio channel priorities, tails, stop and mute (mocked, not listening)', () => {
  const s = new Sound(FakeContext); s.unlock(); assert(s.play('death')); assert(!s.play('shoot')); assert(s.play('bossDeath'));
  s.ctx.currentTime = 2; assert(s.play('shoot')); assert(s.play('shield')); s.play('shieldEnd'); assert(!s.active.has('effect1'));
  s.setMuted(true); assert.equal(s.active.size, 0); assert(!s.play('hit')); s.setMuted(false); assert(s.play('hit')); s.stop(); assert.equal(s.active.size, 0);
});
test('Offline entry points only use local scripts and disallow connections', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert(html.includes("connect-src 'none'")); assert(!/type=["']module/.test(html));
  for (const [,src] of html.matchAll(/<script src="([^"]+)"/g)) { assert(!/[:/]/.test(src)); assert(fs.existsSync(path.join(__dirname,src))); }
  for (const f of ['core.js','render.js','audio.js','game.js','styles.css']) assert(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|@import|https?:\/\//.test(fs.readFileSync(path.join(__dirname,f),'utf8')));
  const portable = fs.readFileSync(path.join(__dirname, 'Phoenix.html'), 'utf8');
  assert(!/<script[^>]*\bsrc=|rel="stylesheet"|https?:\/\//.test(portable));
  assert(portable.includes("connect-src 'none'"));
  assert.equal([...portable.matchAll(/<script>/g)].length, 4);
  for (const f of ['core.js','render.js','audio.js','game.js','styles.css']) assert(portable.includes(fs.readFileSync(path.join(__dirname,f),'utf8').trim()), 'Standalone bundle must match '+f);
});
test('Classic-script boot survives unavailable storage and audio', () => {
  const nodes = new Map(); const context2d = { fillRect(){}, fillStyle:'', imageSmoothingEnabled:false };
  function element(id) { if(!nodes.has(id))nodes.set(id,{ id, tagName:'DIV', value:'1', textContent:'', classList:{remove(){},add(){}}, addEventListener(){}, setAttribute(){}, focus(){}, getContext(){return context2d;} });return nodes.get(id); }
  const sandbox = { console, performance:{now:()=>0}, requestAnimationFrame(){}, document:{ getElementById:element, querySelectorAll:()=>[], addEventListener(){}, querySelector:()=>element('monitor') }, addEventListener(){} };
  sandbox.window=sandbox; Object.defineProperty(sandbox,'localStorage',{get(){throw new Error('storage denied');}});
  vm.createContext(sandbox);
  for(const f of ['core.js','render.js','audio.js','game.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),sandbox,{filename:f});
  const portable = fs.readFileSync(path.join(__dirname, 'Phoenix.html'), 'utf8');
  for (const [,code] of portable.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInContext(code,sandbox);
});
console.log('\n'+checks+' checks passed. Browser interaction / visual checks and listening are separate.');
