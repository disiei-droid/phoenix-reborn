(function() {
  'use strict';
  const $=id=>document.getElementById(id);
  const canvas=$('game'), game=new PhoenixCore.Game(), renderer=new PhoenixRenderer(canvas);
  const sound=new PhoenixAudio.Sound(), keys=new Set(), pointers=new Map();
  let last=performance.now(), savedHigh=0, lastStatus='', firePulse=false, shieldPulse=false;
  try { const value=Number(localStorage.getItem('phoenix-offline-high')); if(Number.isFinite(value)&&value>0)game.high=Math.floor(value); savedHigh=game.high; } catch(_) {}
  const input=()=>({left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),fire:keys.has('Space')||firePulse,shield:keys.has('KeyZ')||keys.has('ArrowDown')||shieldPulse});
  const clearKeys=()=>{keys.clear();pointers.clear();firePulse=false;shieldPulse=false;document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('held'));};
  async function unlock(){ const ok=await sound.unlock(); $('audio-status').textContent=ok?'Sonido sintetizado localmente.':'Audio no disponible; puedes jugar sin sonido.'; }
  function start(practice=false) { unlock(); sound.stop(); clearKeys(); game.start(practice?Number($('practice-stage').value):1,practice); last=performance.now();canvas.focus(); }
  function pause(value) { clearKeys();game.pause(value);game.drainEvents();sound.stop();last=performance.now(); }
  function mute() { sound.setMuted(!sound.muted);$('mute').textContent=sound.muted?'Sonido: no · M':'Sonido: sí · M';$('mute').setAttribute('aria-pressed',String(sound.muted)); }
  $('start').addEventListener('click',()=>start());
  $('practice').addEventListener('click',()=>start(true));
  $('pause').addEventListener('click',()=>pause());
  $('mute').addEventListener('click',()=>{unlock();mute();});
  $('volume').addEventListener('input',e=>sound.setVolume(Number(e.target.value)/100));
  $('stop-audio').addEventListener('click',()=>sound.stop());
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.monitor').requestFullscreen();}catch(_){$('status').textContent='Usa la pantalla completa de tu navegador.';}});
  document.querySelectorAll('[data-sound]').forEach(button=>button.addEventListener('click',async()=>{pause(true);sound.stop();await unlock();sound.play(button.dataset.sound);}));
  const recognized=new Set(['ArrowLeft','ArrowRight','ArrowDown','KeyA','KeyD','Space','KeyZ','KeyP','Escape','KeyM','Enter']);
  window.addEventListener('keydown',e=>{
    if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
    if(!recognized.has(e.code))return;e.preventDefault();
    if(e.code==='Enter'&&!e.repeat) { if(game.paused)pause(false);else if(game.mode==='title'||game.mode==='gameover')start();return; }
    if((e.code==='KeyP'||e.code==='Escape')&&!e.repeat){pause();return;}
    if(e.code==='KeyM'&&!e.repeat){mute();return;}
    keys.add(e.code);if(e.code==='Space')firePulse=true;if(e.code==='KeyZ'||e.code==='ArrowDown')shieldPulse=true;
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>pause(true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
  canvas.addEventListener('pointerdown',()=>{unlock();canvas.focus();if(game.mode==='title'||game.mode==='gameover')start();});
  document.querySelectorAll('[data-key]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{e.preventDefault();unlock();button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,button.dataset.key);keys.add(button.dataset.key);button.classList.add('held');});
    const release=e=>{const key=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(![...pointers.values()].includes(key))keys.delete(key);button.classList.remove('held');};
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  function syncUI() {
    const label=game.mode==='title'?'Listo para jugar':game.mode==='gameover'?'Fin de partida · pulsa Enter':(game.practice?'Práctica':'Ronda '+game.round)+' · Fase '+game.stage+(game.paused?' · En pausa':'');
    if(label!==lastStatus){$('status').textContent=label;lastStatus=label;}
    $('pause').textContent=game.paused?'Seguir · P':'Pausa · P';
    const p=game.player; $('shield-label').textContent=p.shield>0?'Escudo activo':p.reload>0?'Recarga '+Math.ceil(p.reload)+' s':'Escudo listo';
    $('shield-meter').value=p.shield>0?p.shield/1.4:p.reload>0?1-p.reload/5:1;
    if(game.high!==savedHigh){savedHigh=game.high;try{localStorage.setItem('phoenix-offline-high',String(game.high));}catch(_){}}
  }
  function frame(now) { const before=game.ticks;game.advance(Math.min(.2,(now-last)/1000),input());if(game.ticks!==before){firePulse=false;shieldPulse=false;}last=now;for(const event of game.drainEvents())sound.play(event.name);renderer.draw(game);syncUI();requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
})();
