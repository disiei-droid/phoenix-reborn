/* Independent deterministic simulation. No DOM, storage, network or audio. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PhoenixCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const WIDTH = 208, HEIGHT = 256, FPS = 5500000 / 352 / 256, DT = 1 / FPS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  class RNG {
    constructor(seed = 1980) { this.seed = seed >>> 0 || 1; }
    next() { let s = this.seed; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this.seed = s >>> 0; return this.seed / 4294967296; }
    range(a, b) { return a + (b - a) * this.next(); }
  }
  const overlap = (a, b, extra = 0) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + extra && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + extra;
  const swept = (shot, rect) => Math.abs(shot.x - rect.x) <= (shot.w + rect.w) / 2 && Math.max(shot.y, shot.prevY) + shot.h / 2 >= rect.y - rect.h / 2 && Math.min(shot.y, shot.prevY) - shot.h / 2 <= rect.y + rect.h / 2;

  class Game {
    constructor(seed = 1980) {
      this.rng = new RNG(seed); this.high = 0; this.time = 0; this.accumulator = 0;
      this.mode = 'title'; this.paused = false; this.score = 0; this.lives = 3;
      this.round = 1; this.stage = 1; this.events = []; this.effects = []; this.enemies = [];
      this.shots = []; this.missiles = []; this.boss = null; this.practice = false;
      this.player = this.makePlayer(); this.ticks = 0; this.shieldHeld = false;
    }
    makePlayer() { return { x: 104, y: 228, w: 8, h: 13, inv: 0, shield: 0, reload: 0 }; }
    emit(name, value = 0) { if (this.events.length < 96) this.events.push({ name, value }); }
    drainEvents() { return this.events.splice(0); }
    start(stage = 1, practice = false) {
      this.score = 0; this.lives = 3; this.round = 1; this.stage = clamp(stage, 1, 5);
      this.practice = practice; this.time = 0; this.ticks = 0; this.accumulator = 0;
      this.effects = []; this.events = []; this.awarded = new Set(); this.paused = false;
      this.player = this.makePlayer(); this.shieldHeld = false;
      this.loadStage(); this.emit('intro');
    }
    small(index, total = 16) {
      const col = index % 8, row = Math.floor(index / 8);
      const x = 29 + col * 21, y = 48 + Math.abs(col - 3.5) * 8 + row * 24;
      return { kind: 'small', id: index, x, y: -20 - index * 5, homeX: x, homeY: y,
        w: 14, h: 12, mode: 'enter', phase: index * .7, age: 0, enterDelay: index * .065,
        attackIn: this.rng.range(1.2, 5.5), shotIn: this.rng.range(1.5, 4), dead: false };
    }
    loadStage() {
      this.shots = []; this.missiles = []; this.enemies = []; this.boss = null;
      this.stageTime = 0; this.mode = 'ready'; this.timer = 1.25;
      this.player = this.makePlayer(); this.player.inv = 1;
      if (this.stage <= 2) {
        for (let i = 0; i < 16; i++) this.enemies.push(this.small(i));
      } else if (this.stage <= 4) {
        for (let i = 0; i < 8; i++) {
          const x = 30 + (i % 4) * 49, y = 65 + Math.floor(i / 4) * 38;
          this.enemies.push({ kind: 'egg', id: i, x, y: -18 - i * 5, homeX: x, homeY: y,
            w: 8, h: 12, color: this.stage === 3 ? 'blue' : 'pink', hatch: 1.9 + i * .17,
            age: 0, phase: i, leftWing: 0, rightWing: 0, mode: 'enter', enterDelay: i * .07,
            attackIn: this.rng.range(1.5, 3.5), shotIn: this.rng.range(2, 5), dead: false,
            vx: (i % 2 ? 1 : -1) * this.rng.range(20, 37), vy: this.rng.range(6, 12) });
        }
      } else {
        const armor = [];
        for (let row = 0; row < 8; row++) {
          const line = [];
          for (let col = 0; col < 40; col++) line.push(col >= Math.floor(row * .8) && col < 40 - Math.floor(row * .8));
          armor.push(line);
        }
        this.boss = { x: 104, y: 82, armor, belt: Array(40).fill(true), rotation: 0, time: 0, spawnIn: 6, shotIn: 2.5 };
        for (let i = 0; i < 6; i++) { const e = this.small(i); e.homeX = 45 + i * 24; e.homeY = 44 + Math.abs(i - 2.5) * 7; e.attackIn += 1.5; this.enemies.push(e); }
      }
    }
    pause(value = !this.paused) {
      if (this.mode === 'title' || this.mode === 'gameover') return;
      this.paused = value; this.accumulator = 0; this.shieldHeld = false; this.emit('stop');
    }
    advance(seconds, input = {}) {
      if (this.paused) { this.accumulator = 0; return; }
      this.accumulator += clamp(seconds, 0, .2);
      while (this.accumulator + 1e-10 >= DT) { this.step(input); this.accumulator -= DT; }
      if (this.accumulator < 0) this.accumulator = 0;
    }
    step(input = {}) {
      if (this.paused) return;
      this.time += DT; this.ticks++;
      this.effects.forEach(e => { e.life -= DT; }); this.effects = this.effects.filter(e => e.life > 0);
      if (this.mode === 'title' || this.mode === 'gameover') return;
      if (this.mode !== 'playing') {
        this.timer -= DT;
        if (this.timer <= 0) {
          if (this.mode === 'ready') this.mode = 'playing';
          else if (this.mode === 'dying') {
            if (this.lives <= 0) { this.mode = 'gameover'; this.emit('stop'); }
            else { this.player = this.makePlayer(); this.player.inv = 1.6; this.mode = 'ready'; this.timer = .8; }
          } else if (this.mode === 'clear') {
            this.stage++; if (this.stage > 5) { this.stage = 1; this.round++; }
            this.loadStage();
          }
        }
        return;
      }
      this.stageTime += DT;
      const p = this.player;
      p.inv = Math.max(0, p.inv - DT);
      if (p.shield > 0) {
        p.shield = Math.max(0, p.shield - DT);
        if (p.shield === 0) { p.reload = 5; this.emit('shieldEnd'); }
      } else p.reload = Math.max(0, p.reload - DT);
      if (input.shield && !this.shieldHeld && p.reload === 0 && p.shield === 0) { p.shield = 1.4; this.emit('shield'); }
      this.shieldHeld = !!input.shield;
      if (p.shield === 0) p.x = clamp(p.x + ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 96 * DT, 8, WIDTH - 8);
      if (input.fire) this.fire();
      this.updateEnemies();
      this.updateBoss();
      this.updateShots();
      if (this.mode !== 'playing') return;
      this.updateMissiles();
      for (const e of this.enemies) {
        if (!e.dead && e.kind !== 'egg' && overlap(e, p, p.shield > 0 ? 7 : -1)) {
          if (p.shield > 0) this.kill(e, 200); else this.hitPlayer();
        }
      }
      this.enemies = this.enemies.filter(e => !e.dead);
      if (!this.enemies.length && !this.boss && this.mode === 'playing') this.clearStage();
    }
    fire() {
      const limit = this.stage === 2 ? 2 : 1;
      if (this.mode !== 'playing' || this.shots.length >= limit) return false;
      const p = this.player;
      this.shots.push({ x: p.x, y: p.y - 10, prevY: p.y - 10, w: 1, h: 5, vy: -8 * FPS, dead: false });
      this.emit('shoot'); return true;
    }
    updateEnemies() {
      const speed = Math.min(1.9, 1 + (this.round - 1) * .12);
      for (const e of this.enemies) {
        e.age += DT; e.phase += DT * 9;
        if (e.kind === 'large') {
          e.leftWing = Math.max(0, e.leftWing - DT); e.rightWing = Math.max(0, e.rightWing - DT);
          e.x += e.vx * DT * speed * (e.leftWing > 0 || e.rightWing > 0 ? 1.35 : 1);
          e.y += e.vy * DT * speed;
          if (e.x < 21 || e.x > 187) { e.x = clamp(e.x, 21, 187); e.vx *= -1; }
          if (e.y > 235 || e.y < 48) { e.y = clamp(e.y, 48, 235); e.vy *= -1; }
          e.shotIn -= DT;
          if (e.shotIn <= 0 && e.y < 195) {
            if (this.missiles.length < 8) this.missiles.push({ x: e.x, y: e.y + 6, prevY: e.y + 6, w: 2, h: 4, vx: 0, vy: 64 * speed, dead: false });
            e.shotIn = this.rng.range(3, 6) / speed;
          }
          continue;
        }
        if (e.mode === 'enter') {
          if (e.age < e.enterDelay) continue;
          e.y = Math.min(e.homeY, e.y + 105 * DT);
          if (e.y === e.homeY) e.mode = 'formation';
        } else if (e.mode === 'formation') {
          e.x = e.homeX + Math.sin(this.stageTime * 1.1) * 7;
          e.y = e.homeY; e.attackIn -= DT * speed;
          if (e.kind === 'egg') {
            e.hatch -= DT;
            if (e.hatch <= 0) { e.kind = 'large'; e.w = 40; e.h = 18; e.mode = 'free'; this.emit('hatch'); }
            continue;
          }
          if (e.attackIn <= 0) {
            e.mode = 'dive'; e.diveTime = 0; e.fromX = e.x; e.fromY = e.y;
            e.targetX = clamp(this.player.x + this.rng.range(-25, 25), 12, WIDTH - 12);
            e.duration = this.rng.range(2, 2.8) / speed; this.emit('dive');
          }
        } else if (e.mode === 'dive') {
          e.diveTime += DT;
          const u = e.diveTime / e.duration;
          e.x = clamp(e.fromX + (e.targetX - e.fromX) * Math.min(u, 1) + Math.sin(u * Math.PI * 2) * 23 * Math.sin(u * Math.PI), 7, WIDTH - 7);
          e.y = e.fromY + u * (HEIGHT + 18 - e.fromY);
          if (u >= 1) { e.mode = 'enter'; e.age = 0; e.enterDelay = 0; e.y = -18; e.x = e.homeX; e.attackIn = this.rng.range(.8, 3); }
        }
        if (e.kind === 'egg') continue;
        e.shotIn -= DT;
        if (e.shotIn <= 0 && e.y > 38 && e.y < 200) {
          if (this.missiles.length < 10) this.missiles.push({ x: e.x, y: e.y + 7, prevY: e.y + 7, w: 2, h: 4, vx: 0, vy: (63 + this.stage * 4) * speed, dead: false });
          e.shotIn = this.rng.range(2.8, 6.2) / speed;
        }
      }
    }
    updateShots() {
      for (const b of this.shots) {
        b.prevY = b.y; b.y += b.vy * DT;
        const candidates = this.enemies.filter(e => !e.dead && swept(b, e)).sort((a, c) => c.y - a.y);
        let enemy = null;
        for (const e of candidates) {
          const side = b.x - e.x;
          if (e.kind === 'large' && ((side < -4 && e.leftWing > 0) || (side > 4 && e.rightWing > 0))) continue;
          enemy = e; break;
        }
        const bossHit = this.boss ? this.bossContact(b) : null;
        if (bossHit && (!enemy || bossHit.y > enemy.y + enemy.h / 2)) { this.damageBoss(bossHit); b.dead = true; }
        else if (enemy) { this.hitEnemy(enemy, b.x); b.dead = true; }
      }
      this.shots = this.shots.filter(b => !b.dead && b.y > 29);
    }
    hitEnemy(e, x = e.x) {
      if (e.kind === 'large') {
        if (Math.abs(x - e.x) <= 4) this.kill(e, e.color === 'blue' ? 100 : 50);
        else {
          const wing = x < e.x ? 'leftWing' : 'rightWing';
          if (e[wing] <= 0) { e[wing] = 2.8; this.burst(x, e.y); this.emit('wing'); }
        }
      } else if (e.kind === 'egg') this.kill(e, e.hatch < .65 ? 800 : 100);
      else this.kill(e, e.mode === 'dive' ? 200 : e.y < 65 ? 80 : e.y < 85 ? 40 : 20);
    }
    updateBoss() {
      const b = this.boss; if (!b) return;
      b.time += DT; b.x = 104 + Math.sin(b.time * .42) * 10;
      b.y = Math.min(166, 82 + b.time * .32); b.rotation = Math.floor(b.time * 6) % 40;
      b.spawnIn -= DT; b.shotIn -= DT;
      if (b.spawnIn <= 0) {
        if (this.enemies.length < 6) { const e = this.small(this.ticks % 8); e.homeX = 32 + (this.ticks % 6) * 28; e.homeY = 49; e.attackIn = .5; this.enemies.push(e); }
        b.spawnIn = 4;
      }
      if (b.shotIn <= 0) {
        if (this.missiles.length < 10) this.missiles.push({ x: b.x - 48, y: b.y + 62, prevY: b.y + 62, w: 2, h: 4, vx: 0, vy: 71, dead: false }, { x: b.x + 48, y: b.y + 62, prevY: b.y + 62, w: 2, h: 4, vx: 0, vy: 71, dead: false });
        b.shotIn = 2.2;
      }
    }
    bossContact(shot) {
      const b = this.boss, left = Math.round(b.x) - 80, top = Math.round(b.y);
      const col = Math.floor((shot.x - left) / 4);
      if (col < 0 || col >= 40) return null;
      for (let row = 7; row >= 0; row--) {
        const y = top + 38 + row * 3;
        if (b.armor[row][col] && swept(shot, { x: left + col * 4 + 2, y: y + 1.5, w: 4, h: 3 })) return { type: 'armor', col, row, y: y + 3 };
      }
      const belt = (col + b.rotation) % 40;
      if (b.belt[belt] && swept(shot, { x: left + col * 4 + 2, y: top + 34, w: 4, h: 8 })) return { type: 'belt', col: belt, y: top + 38 };
      if (swept(shot, { x: Math.round(b.x), y: top + 22, w: 9, h: 13 })) return { type: 'core', y: top + 28 };
      if (Math.abs(shot.x - b.x) > 7 && swept(shot, { x: b.x, y: top + 21, w: 104, h: 18 })) return { type: 'dome', y: top + 30 };
      return null;
    }
    damageBoss(hit) {
      const b = this.boss; if (!b) return;
      if (hit.type === 'armor') {
        for (let c = Math.max(0, hit.col - 1); c <= Math.min(39, hit.col + 1); c++) b.armor[hit.row][c] = false;
        this.emit('armor');
      } else if (hit.type === 'belt') {
        b.belt[hit.col] = false; b.belt[(hit.col + 1) % 40] = false; this.emit('armor');
      } else if (hit.type === 'core') {
        this.addScore(Math.min(9000, 1000 + Math.floor(b.time / 5) * 1000));
        this.burst(b.x, b.y + 28, true); this.boss = null; this.enemies = [];
        this.clearStage(); this.timer = 2.2; this.emit('bossDeath');
      }
    }
    updateMissiles() {
      for (const m of this.missiles) {
        m.prevY = m.y; m.y += m.vy * DT; m.x += m.vx * DT;
        if (swept(m, { ...this.player, w: this.player.shield > 0 ? 25 : 7, h: this.player.shield > 0 ? 25 : 11 })) {
          m.dead = true; if (this.player.shield <= 0) this.hitPlayer();
        }
      }
      this.missiles = this.missiles.filter(m => !m.dead && m.y < HEIGHT + 4 && m.x > -5 && m.x < WIDTH + 5);
    }
    addScore(value) {
      this.score += value;
      if (!this.practice && this.score > this.high) this.high = this.score;
      for (const threshold of [3000, 30000]) if (this.score >= threshold && !this.awarded.has(threshold)) { this.awarded.add(threshold); this.lives++; this.emit('bonus'); }
    }
    kill(e, score) { if (e.dead) return; e.dead = true; this.addScore(score); this.burst(e.x, e.y); this.emit('hit'); }
    burst(x, y, big = false) { this.effects.push({ x, y, life: big ? 1.8 : .32, max: big ? 1.8 : .32, big }); }
    hitPlayer() {
      if (this.mode !== 'playing' || this.player.inv > 0 || this.player.shield > 0) return;
      this.burst(this.player.x, this.player.y); this.lives--; this.mode = 'dying'; this.timer = 1.1;
      this.shots = []; this.missiles = []; this.emit('death');
    }
    clearStage() { this.mode = 'clear'; this.timer = 1.4; this.missiles = []; this.shots = []; this.emit('clear'); }
  }
  return { Game, RNG, WIDTH, HEIGHT, FPS, DT, overlap, swept, clamp };
});
