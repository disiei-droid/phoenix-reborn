/* Local event synthesis, intentionally not a circuit-level emulator. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PhoenixAudio=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const SPECS={
    shoot:{duration:.23,channel:'noise',priority:1},
    dive:{duration:.42,channel:'effect2',priority:1},
    wing:{duration:.19,channel:'effect2',priority:2},
    hit:{duration:.28,channel:'effect2',priority:3},
    hatch:{duration:.7,channel:'effect1',priority:1},
    shield:{duration:1.4,channel:'effect1',priority:3},
    armor:{duration:.12,channel:'noise',priority:2},
    death:{duration:.75,channel:'noise',priority:5},
    bossDeath:{duration:1.8,channel:'noise',priority:6},
    intro:{duration:2.15,channel:'melody',priority:1},
    clear:{duration:.5,channel:'melody',priority:1},
    bonus:{duration:.65,channel:'melody',priority:2}
  };
  function synthesize(name,rate=44100){
    const spec=SPECS[name];if(!spec)throw new Error('Unknown sound: '+name);
    const out=new Float32Array(Math.ceil(rate*spec.duration));
    let phase=0,noisePhase=0,lfsr=0,lowpass=0,last=0;
    const melody=name==='intro'?[659.25,622.25,659.25,622.25,659.25,493.88,587.33,523.25,440]:[440,554.37,659.25];
    for(let i=0;i<out.length;i++){
      const t=i/rate,u=t/spec.duration;
      const env=Math.min(1,t/.003)*Math.min(1,(spec.duration-t)/.025);
      let v=0;
      if(spec.channel==='melody'){
        const noteDuration=spec.duration/melody.length,index=Math.min(melody.length-1,Math.floor(t/noteDuration)),nt=t-index*noteDuration;
        const f=melody[index];phase=(phase+f/rate)%1;
        v=(Math.sin(phase*2*Math.PI)+.27*Math.sin(phase*4*Math.PI))*.18*Math.exp(-nt*11);
      }else{
        const noiseClock=588+6325*Math.exp(-t/(name==='shoot'?.136:.3196));
        noisePhase+=noiseClock/rate;
        while(noisePhase>=1){noisePhase--;const bit=1^((lfsr>>>16)&1)^((lfsr>>>17)&1);lfsr=((lfsr<<1)|bit)&0x3ffff;}
        const raw=(lfsr&1)?1:-1;
        lowpass+=(raw-lowpass)*.14;
        let f=240,amp=.2;
        if(name==='shoot'){f=2200*Math.exp(-t*10)+140;v=(raw*.23+lowpass*.23)*Math.exp(-t*17);}
        else if(name==='death'||name==='bossDeath'){f=180*(1-u)+45;v=(raw*.32+lowpass*.35)*Math.pow(1-u,1.8);}
        else if(name==='armor'){f=210;v=raw*.26*Math.exp(-t*30);}
        else if(name==='shield'){f=370+180*Math.sin(t*19);amp=.13;}
        else if(name==='hatch'){f=400+150*Math.sin(t*11);amp=.13;}
        else if(name==='dive'){f=1000-800*u+120*Math.sin(t*25);amp=.12;}
        else if(name==='wing'){f=950-650*u;amp=.2*(1-u);}
        else if(name==='hit'){f=230+450*(1-u)*(1-u);amp=.19*(1-u);v+=lowpass*.16*(1-u);}
        phase=(phase+f/rate)%1;
        const pulse=phase<.42?1:-1;
        if(name!=='armor')v+=pulse*amp*(spec.channel==='noise'?Math.exp(-t*9):1);
      }
      // DC blocking and bounded headroom. No random sources, even for noise.
      const filtered=v-last;last=v*.003+last*.997;
      out[i]=Math.max(-.85,Math.min(.85,filtered*env));
    }
    return out;
  }
  class Sound{
    constructor(Context=null){
      this.Context=Context;this.ctx=null;this.master=null;this.volume=.3;this.muted=false;
      this.active=new Map();this.cache=new Map();
    }
    async unlock(){
      try{
        if(!this.ctx){
          const C=this.Context||(typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext));
          if(!C)return false;
          this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=this.muted?0:this.volume;
          const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=5200;
          this.master.connect(filter);filter.connect(this.ctx.destination);
        }
        if(this.ctx.state==='suspended')await this.ctx.resume();
        return this.ctx.state==='running';
      }catch(_){return false;}
    }
    setMuted(value){this.muted=value;if(value)this.stop();if(this.master)this.master.gain.setValueAtTime(value?0:this.volume,this.ctx.currentTime);}
    setVolume(value){this.volume=Math.max(0,Math.min(.8,value));if(this.master)this.master.gain.setValueAtTime(this.muted?0:this.volume,this.ctx.currentTime);}
    cancel(channel){
      const entry=this.active.get(channel);if(!entry)return;
      try{entry.gain.gain.cancelScheduledValues(this.ctx.currentTime);entry.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.004);entry.source.stop(this.ctx.currentTime+.025);}catch(_){}
      this.active.delete(channel);
    }
    stop(){for(const channel of [...this.active.keys()])this.cancel(channel);}
    play(name){
      if(name==='stop'){this.stop();return false;}
      if(name==='shieldEnd'){if(this.active.get('effect1')?.name==='shield')this.cancel('effect1');return false;}
      const spec=SPECS[name];
      if(!spec||!this.ctx||this.ctx.state!=='running'||this.muted)return false;
      const now=this.ctx.currentTime,current=this.active.get(spec.channel);
      if(current&&current.ends>now&&current.priority>spec.priority)return false;
      this.cancel(spec.channel);
      let buffer=this.cache.get(name);
      if(!buffer){const data=synthesize(name,this.ctx.sampleRate);buffer=this.ctx.createBuffer(1,data.length,this.ctx.sampleRate);buffer.getChannelData(0).set(data);this.cache.set(name,buffer);}
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
      gain.gain.value=1;source.buffer=buffer;source.connect(gain);gain.connect(this.master);
      const entry={name,source,gain,priority:spec.priority,ends:now+spec.duration};
      this.active.set(spec.channel,entry);
      source.onended=()=>{source.disconnect();gain.disconnect();if(this.active.get(spec.channel)===entry)this.active.delete(spec.channel);};
      source.start(now);return true;
    }
  }
  return {Sound,synthesize,SPECS};
});
