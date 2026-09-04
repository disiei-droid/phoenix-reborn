/* All graphics and lettering are drawn locally; no external assets. */
(function(root) {
  'use strict';
  const C = { cyan:'#2adfbd', red:'#df1718', blue:'#2222e0', yellow:'#efcf34', pale:'#f5df9c', pink:'#eaaaae', magenta:'#bb16cc', green:'#c7ed38', white:'#ffffff' };
  const FONT = {
    A:['01110','11011','11011','11111','11011','11011','11011'], B:['11110','11011','11011','11110','11011','11011','11110'],
    C:['01111','11000','11000','11000','11000','11000','01111'], D:['11110','11011','11011','11011','11011','11011','11110'],
    E:['11111','11000','11000','11110','11000','11000','11111'], F:['11111','11000','11000','11110','11000','11000','11000'],
    G:['01111','11000','11000','11011','11011','11011','01111'], H:['11011','11011','11011','11111','11011','11011','11011'],
    I:['11111','00100','00100','00100','00100','00100','11111'], J:['00111','00011','00011','00011','11011','11011','01110'],
    K:['11011','11010','11100','11100','11110','11011','11011'], L:['11000','11000','11000','11000','11000','11000','11111'],
    M:['10001','11011','11111','10101','10001','10001','10001'], N:['11001','11001','11101','11111','11011','11011','11001'],
    O:['01110','11011','11011','11011','11011','11011','01110'], P:['11110','11011','11011','11110','11000','11000','11000'],
    Q:['01110','11011','11011','11011','11111','00110','00011'], R:['11110','11011','11011','11110','11100','11010','11011'],
    S:['01111','11000','11000','01110','00011','00011','11110'], T:['11111','00100','00100','00100','00100','00100','00100'],
    U:['11011','11011','11011','11011','11011','11011','01110'], V:['10001','10001','11011','11011','01010','01110','00100'],
    W:['10001','10001','10001','10101','11111','11011','10001'], X:['10001','11011','01010','00100','01010','11011','10001'],
    Y:['10001','11011','01010','00100','00100','00100','00100'], Z:['11111','00011','00110','01100','11000','11000','11111'],
    '0':['01110','11011','11011','11111','11011','11011','01110'], '1':['00100','01100','00100','00100','00100','00100','01110'],
    '2':['01110','11011','00011','00110','01100','11000','11111'], '3':['11110','00011','00011','01110','00011','00011','11110'],
    '4':['00011','00111','01011','11011','11111','00011','00011'], '5':['11111','11000','11000','11110','00011','00011','11110'],
    '6':['01110','11000','11000','11110','11011','11011','01110'], '7':['11111','00011','00110','00110','01100','01100','01100'],
    '8':['01110','11011','11011','01110','11011','11011','01110'], '9':['01110','11011','11011','01111','00011','00011','01110'],
    '-':['00000','00000','00000','11111','00000','00000','00000'], ':':['00000','00100','00100','00000','00100','00100','00000'],
    '.':['00000','00000','00000','00000','00000','00110','00110'], '/':['00001','00011','00010','00100','01000','11000','10000'],
    '!':['00100','00100','00100','00100','00100','00000','00100'], '?':['01110','10001','00001','00110','00100','00000','00100']
  };
  const SHIP = [
    '......r......','......r......','......r......','..w...r...w..','..w..rrr..w..',
    '..wr.ryr.rw..','..wrrrrrrrw..','..wrrwywrrw..','..wrrwywrrw..','..wrrryrrrw..',
    '.wwrrryrrrww.','.wrrr...rrrw.','.wr.r...r.rw.','ww..r...r..ww','w...r...r...w','....w...w....'
  ];
  class Renderer {
    constructor(canvas) {
      this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.ctx.imageSmoothingEnabled=false;
      const random=new root.PhoenixCore.RNG(51280);
      this.stars=Array.from({length:155},(_,i)=>({x:random.range(0,208)|0,y:random.range(28,256)|0,c:i%19===0?'#b5b5ef':i%13===0?'#e1c62c':C.blue,cross:i%23===0}));
      this.dust=Array.from({length:130},(_,i)=>({x:(i%2?168:41)+random.range(-19,19),y:(i%2?194:99)+random.range(-18,18)}));
    }
    rect(x,y,w,h,color) { this.ctx.fillStyle=color; this.ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
    text(str,x,y,color=C.cyan,spacing=8,scale=1) {
      for(const ch of str.toUpperCase()) {
        const rows=FONT[ch]; if(rows)rows.forEach((r,yy)=>{for(let xx=0;xx<5;xx++)if(r[xx]==='1')this.rect(x+xx*scale,y+yy*scale,scale,scale,color);});
        x+=spacing*scale;
      }
    }
    center(str,y,color=C.cyan) { this.text(str,(208-(str.length*8-3))/2,y,color); }
    bitmap(rows,x,y,palette) { rows.forEach((r,yy)=>{for(let xx=0;xx<r.length;xx++)if(palette[r[xx]])this.rect(x+xx,y+yy,1,1,palette[r[xx]]);}); }
    player(p,time=0,force=false) {
      if(!force&&p.inv>0&&Math.floor(time*9)%2===0)return;
      this.bitmap(SHIP,Math.round(p.x)-6,Math.round(p.y)-8,{r:C.red,w:C.white,y:C.yellow});
      if(p.shield>0) {
        for(let y=-12;y<=12;y++)for(let x=-12;x<=12;x++) {
          const d=x*x+y*y;
          if(d>108&&d<150)this.rect(p.x+x,p.y+y,1,1,C.pink);
          else if(d<100&&(x+y+Math.floor(time*20))%4===0)this.rect(p.x+x,p.y+y,1,1,C.magenta);
        }
      }
    }
    small(e,stage=1) {
      const frame=Math.floor(e.phase||0)%3, x=Math.round(e.x)-7, y=Math.round(e.y)-6;
      const wing=stage===2||stage===5?C.pink:'#eceb50', body=stage===2||stage===5?'#42ed35':C.magenta;
      for(let side of [-1,1]) {
        for(let n=0;n<6;n++) {
          const height=frame===1?Math.floor(n*.7):5-Math.floor(n*.6);
          this.rect(x+7+side*(n+1)-(side<0?1:0),y+2+height,2,frame===2?2:3,wing);
          if(n>3)this.rect(x+7+side*(n+1),y+4+height,1,3,wing);
        }
      }
      this.rect(x+6,y+3,3,6,body);this.rect(x+5,y+1,1,3,body);this.rect(x+9,y+1,1,3,body);
      this.rect(x+7,y+8,1,3,body);this.rect(x+5,y+9,1,2,wing);this.rect(x+9,y+9,1,2,wing);
    }
    egg(e) {
      const x=Math.round(e.x)-4,y=Math.round(e.y)-6,color=e.color==='pink'?C.pink:'#25b6d6';
      for(let yy=0;yy<12;yy++) { const width=yy<3?4:yy<9?8:6;this.rect(x+4-width/2,y+yy,width,1,color); }
      for(let i=0;i<9;i++)this.rect(x+1+(i*3)%6,y+2+Math.floor(i/3)*3,1,1,C.magenta);
      if(e.hatch<.65) { this.rect(x+2,y+5,4,1,'#000');this.rect(x+3,y+4,1,3,'#000'); }
    }
    large(e) {
      const flap=Math.floor(e.phase)%3, color=e.color==='pink'?C.pink:'#20b6d1';
      const x=Math.round(e.x), y=Math.round(e.y);
      for(const side of [-1,1]) {
        if((side<0?e.leftWing:e.rightWing)>0)continue;
        for(let n=0;n<17;n++) {
          const yy=flap===1?-2+Math.floor(n*.48):-6+Math.floor(n*n/38);
          this.rect(x+side*(n+3)-(side<0?1:0),y+yy,2,4,color);
          if(n%3===0)this.rect(x+side*(n+3),y+yy+4,1,2,color);
        }
      }
      for(let i=0;i<7;i++)this.rect(x-3+Math.floor(i/3),y-5+i,6-Math.floor(i/3)*2,1,C.magenta);
      this.rect(x-1,y-7,2,2,C.pale);this.rect(x-2,y+2,1,4,C.green);this.rect(x+2,y+2,1,4,C.green);
      this.rect(x-4,y+5,3,1,C.green);this.rect(x+2,y+5,3,1,C.green);
    }
    enemy(e,stage) { if(e.kind==='egg')this.egg(e);else if(e.kind==='large')this.large(e);else this.small(e,stage); }
    boss(b) {
      const x=Math.round(b.x),y=Math.round(b.y),left=x-80;
      // Stepped dome, antenna and exposed central creature.
      this.rect(x-2,y-15,4,28,C.magenta);
      for(let r=0;r<5;r++){this.rect(x-11,y-14+r*3,8,1,C.yellow);this.rect(x+4,y-14+r*3,8,1,C.yellow);}
      for(let n=-9;n<=9;n+=3)this.rect(x+n,y-15,1,15,C.yellow);
      for(let row=0;row<10;row++)this.rect(x-20-row*4,y+row*3,40+row*8,3,C.green);
      this.rect(x-7,y+10,14,21,'#000');
      this.bitmap(['m...m...m','.m.m.m.m.','..mmmmm..','...mmm...','..mmmmm..','.mm.m.mm.','mm..m..mm','m...m...m','...m.m...','..m...m..'],x-4,y+16,{m:C.magenta});
      this.rect(x-29,y+13,2,9,C.magenta);this.rect(x-32,y+16,8,2,C.magenta);
      this.rect(x+27,y+13,2,9,C.magenta);this.rect(x+24,y+16,8,2,C.magenta);
      for(let n=0;n<16;n++)if(n<7||n>8)this.rect(x-47+n*6,y+26,2,2,C.magenta);
      for(let col=0;col<40;col++)if(b.belt[(col+b.rotation)%40]){
        this.rect(left+col*4,y+30,4,8,C.magenta);
        if(col%4===0)this.rect(left+col*4+1,y+32,2,4,'#000');
      }
      for(let row=0;row<8;row++)for(let col=0;col<40;col++)if(b.armor[row][col]){
        this.rect(left+col*4,y+38+row*3,4,3,C.yellow);
        if(row===7||!b.armor[row+1]?.[col])this.rect(left+col*4+(col%3),y+40+row*3,1,2,C.yellow);
      }
    }
    background(g) {
      this.rect(0,0,208,256,'#000');
      for(const s of this.stars) {
        const y=28+((s.y-28+Math.floor(g.time*2))%228);
        this.rect(s.x,y,1,1,s.c);
        if(s.cross){this.rect(s.x-1,y,3,1,s.c);this.rect(s.x,y-1,1,3,s.c);}
      }
      for(const p of this.dust)this.rect(p.x,28+((p.y-28+Math.floor(g.time*2))%228),1,1,'#080889');
    }
    hud(g) {
      this.text('SCORE1',1,1);this.text('HI-SCORE',65,1);this.text('SCORE2',161,1);
      this.text(String(g.score%1000000).padStart(6,'0'),1,10,C.red);
      this.text(String(g.high%1000000).padStart(6,'0'),73,10,C.red);
      this.text('000000',161,10,C.red);
      this.small({x:15,y:24,phase:0},g.stage);this.text('X'+Math.max(0,g.lives-1),22,21,C.red);
      this.text('COIN',81,21);this.text('00',113,21,C.red);
    }
    title(g) {
      const word='PHOENIX', x0=7,y0=59;
      for(let l=0;l<word.length;l++)FONT[word[l]].forEach((r,yy)=>{
        for(let xx=0;xx<5;xx++)if(r[xx]==='1') {
          const x=x0+l*28+xx*5,y=y0+yy*7;
          this.rect(x,y+2,1,4,C.yellow);this.rect(x+4,y+2,1,4,C.yellow);
          this.rect(x+1,y+1,1,2,C.yellow);this.rect(x+3,y+1,1,2,C.yellow);
          this.rect(x+2,y+2,1,5,C.magenta);
        }
      });
      this.small({x:43,y:136,phase:g.time*7});this.text('20 40 80',68,132,C.white);
      this.large({x:43,y:158,phase:g.time*7,color:'blue',leftWing:0,rightWing:0});this.text('50 - 800',68,154,C.white);
      if(Math.floor(g.time*1.8)%2===0)this.center('PUSH START',193,C.pink);
      this.center('PHOENIX 1980',220);this.center('AMSTAR / CENTURI',232);
    }
    draw(g) {
      this.background(g);this.hud(g);
      if(g.mode==='title'){this.title(g);return;}
      this.ctx.save();this.ctx.beginPath();this.ctx.rect(0,32,208,224);this.ctx.clip();
      if(g.boss)this.boss(g.boss);
      for(const e of g.enemies)this.enemy(e,g.stage);
      for(const b of g.shots)this.rect(b.x,b.y,1,5,C.white);
      for(const m of g.missiles){this.rect(m.x,m.y,1,4,C.white);this.rect(m.x+1,m.y+2,1,1,C.pink);}
      if(g.mode!=='dying'&&g.mode!=='gameover')this.player(g.player,g.time);
      for(const e of g.effects) {
        const age=1-e.life/e.max, radius=2+age*(e.big?52:12);
        for(let n=0;n<(e.big?70:14);n++){
          const a=n*2.399, r=radius*(.3+(n%7)/10);
          this.rect(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,n%3===0?2:1,2,n%3===0?C.yellow:n%2===0?C.magenta:C.white);
        }
      }
      this.ctx.restore();
      if(g.paused){this.rect(31,117,146,29,'#000');this.center('PAUSA',119,C.pink);this.center('P PARA SEGUIR',134,C.cyan);}
      else if(g.mode==='ready'){this.center('PLAYER 1',170,C.red);}
      else if(g.mode==='gameover'){this.rect(25,118,158,32,'#000');this.center('GAME OVER',119,C.red);this.center('PUSH START',136,C.cyan);}
    }
  }
  root.PhoenixRenderer=Renderer;
})(globalThis);
