// QR-Encoder (byte mode, EC M/L/Q/H). Tabellen aus segno, gegen OpenCV-Decoder verifiziert.
/* eslint-disable */

const ECC={1:[[[1,26,16]],[[1,26,19]],[[1,26,9]],[[1,26,13]]],2:[[[1,44,28]],[[1,44,34]],[[1,44,16]],[[1,44,22]]],3:[[[1,70,44]],[[1,70,55]],[[2,35,13]],[[2,35,17]]],4:[[[2,50,32]],[[1,100,80]],[[4,25,9]],[[2,50,24]]],5:[[[2,67,43]],[[1,134,108]],[[2,33,11],[2,34,12]],[[2,33,15],[2,34,16]]],6:[[[4,43,27]],[[2,86,68]],[[4,43,15]],[[4,43,19]]],7:[[[4,49,31]],[[2,98,78]],[[4,39,13],[1,40,14]],[[2,32,14],[4,33,15]]],8:[[[2,60,38],[2,61,39]],[[2,121,97]],[[4,40,14],[2,41,15]],[[4,40,18],[2,41,19]]],9:[[[3,58,36],[2,59,37]],[[2,146,116]],[[4,36,12],[4,37,13]],[[4,36,16],[4,37,17]]],10:[[[4,69,43],[1,70,44]],[[2,86,68],[2,87,69]],[[6,43,15],[2,44,16]],[[6,43,19],[2,44,20]]],11:[[[1,80,50],[4,81,51]],[[4,101,81]],[[3,36,12],[8,37,13]],[[4,50,22],[4,51,23]]],12:[[[6,58,36],[2,59,37]],[[2,116,92],[2,117,93]],[[7,42,14],[4,43,15]],[[4,46,20],[6,47,21]]],13:[[[8,59,37],[1,60,38]],[[4,133,107]],[[12,33,11],[4,34,12]],[[8,44,20],[4,45,21]]],14:[[[4,64,40],[5,65,41]],[[3,145,115],[1,146,116]],[[11,36,12],[5,37,13]],[[11,36,16],[5,37,17]]],15:[[[5,65,41],[5,66,42]],[[5,109,87],[1,110,88]],[[11,36,12],[7,37,13]],[[5,54,24],[7,55,25]]],16:[[[7,73,45],[3,74,46]],[[5,122,98],[1,123,99]],[[3,45,15],[13,46,16]],[[15,43,19],[2,44,20]]],17:[[[10,74,46],[1,75,47]],[[1,135,107],[5,136,108]],[[2,42,14],[17,43,15]],[[1,50,22],[15,51,23]]],18:[[[9,69,43],[4,70,44]],[[5,150,120],[1,151,121]],[[2,42,14],[19,43,15]],[[17,50,22],[1,51,23]]],19:[[[3,70,44],[11,71,45]],[[3,141,113],[4,142,114]],[[9,39,13],[16,40,14]],[[17,47,21],[4,48,22]]],20:[[[3,67,41],[13,68,42]],[[3,135,107],[5,136,108]],[[15,43,15],[10,44,16]],[[15,54,24],[5,55,25]]],21:[[[17,68,42]],[[4,144,116],[4,145,117]],[[19,46,16],[6,47,17]],[[17,50,22],[6,51,23]]],22:[[[17,74,46]],[[2,139,111],[7,140,112]],[[34,37,13]],[[7,54,24],[16,55,25]]],23:[[[4,75,47],[14,76,48]],[[4,151,121],[5,152,122]],[[16,45,15],[14,46,16]],[[11,54,24],[14,55,25]]],24:[[[6,73,45],[14,74,46]],[[6,147,117],[4,148,118]],[[30,46,16],[2,47,17]],[[11,54,24],[16,55,25]]],25:[[[8,75,47],[13,76,48]],[[8,132,106],[4,133,107]],[[22,45,15],[13,46,16]],[[7,54,24],[22,55,25]]],26:[[[19,74,46],[4,75,47]],[[10,142,114],[2,143,115]],[[33,46,16],[4,47,17]],[[28,50,22],[6,51,23]]],27:[[[22,73,45],[3,74,46]],[[8,152,122],[4,153,123]],[[12,45,15],[28,46,16]],[[8,53,23],[26,54,24]]],28:[[[3,73,45],[23,74,46]],[[3,147,117],[10,148,118]],[[11,45,15],[31,46,16]],[[4,54,24],[31,55,25]]],29:[[[21,73,45],[7,74,46]],[[7,146,116],[7,147,117]],[[19,45,15],[26,46,16]],[[1,53,23],[37,54,24]]],30:[[[19,75,47],[10,76,48]],[[5,145,115],[10,146,116]],[[23,45,15],[25,46,16]],[[15,54,24],[25,55,25]]],31:[[[2,74,46],[29,75,47]],[[13,145,115],[3,146,116]],[[23,45,15],[28,46,16]],[[42,54,24],[1,55,25]]],32:[[[10,74,46],[23,75,47]],[[17,145,115]],[[19,45,15],[35,46,16]],[[10,54,24],[35,55,25]]],33:[[[14,74,46],[21,75,47]],[[17,145,115],[1,146,116]],[[11,45,15],[46,46,16]],[[29,54,24],[19,55,25]]],34:[[[14,74,46],[23,75,47]],[[13,145,115],[6,146,116]],[[59,46,16],[1,47,17]],[[44,54,24],[7,55,25]]],35:[[[12,75,47],[26,76,48]],[[12,151,121],[7,152,122]],[[22,45,15],[41,46,16]],[[39,54,24],[14,55,25]]],36:[[[6,75,47],[34,76,48]],[[6,151,121],[14,152,122]],[[2,45,15],[64,46,16]],[[46,54,24],[10,55,25]]],37:[[[29,74,46],[14,75,47]],[[17,152,122],[4,153,123]],[[24,45,15],[46,46,16]],[[49,54,24],[10,55,25]]],38:[[[13,74,46],[32,75,47]],[[4,152,122],[18,153,123]],[[42,45,15],[32,46,16]],[[48,54,24],[14,55,25]]],39:[[[40,75,47],[7,76,48]],[[20,147,117],[4,148,118]],[[10,45,15],[67,46,16]],[[43,54,24],[22,55,25]]],40:[[[18,75,47],[31,76,48]],[[19,148,118],[6,149,119]],[[20,45,15],[61,46,16]],[[34,54,24],[34,55,25]]]};
const ALIGN={1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],7:[6,22,38],8:[6,24,42],9:[6,26,46],10:[6,28,50],11:[6,30,54],12:[6,32,58],13:[6,34,62],14:[6,26,46,66],15:[6,26,48,70],16:[6,26,50,74],17:[6,30,54,78],18:[6,30,56,82],19:[6,30,58,86],20:[6,34,62,90],21:[6,28,50,72,94],22:[6,26,50,74,98],23:[6,30,54,78,102],24:[6,28,54,80,106],25:[6,32,58,84,110],26:[6,30,58,86,114],27:[6,34,62,90,118],28:[6,26,50,74,98,122],29:[6,30,54,78,102,126],30:[6,26,52,78,104,130],31:[6,30,56,82,108,134],32:[6,34,60,86,112,138],33:[6,30,58,86,114,142],34:[6,34,62,90,118,146],35:[6,30,54,78,102,126,150],36:[6,24,50,76,102,128,154],37:[6,28,54,80,106,132,158],38:[6,32,58,84,110,136,162],39:[6,26,54,82,110,138,166],40:[6,30,58,86,114,142,170]};
const FMT=[21522,20773,24188,23371,17913,16590,20375,19104,30660,29427,32170,30877,26159,25368,27713,26998,5769,5054,7399,6608,1890,597,3340,2107,13663,12392,16177,14854,9396,8579,11994,11245];
const VER=[31892,34236,39577,42195,48118,51042,55367,58893,63784,68472,70749,76311,79154,84390,87683,92361,96236,102084,102881,110507,110734,117786,119615,126325,127568,133589,136944,141498,145311,150283,152622,158308,161089,167017];
// QR-Encoder (byte mode). ecIdx: 0=M,1=L,2=H,3=Q  (segno-Reihenfolge). Tabellen aus segno verifiziert.
const REM = {1:0,2:7,3:7,4:7,5:7,6:7,7:0,8:0,9:0,10:0,11:0,12:0,13:0,
  14:3,15:3,16:3,17:3,18:3,19:3,20:3,21:4,22:4,23:4,24:4,25:4,26:4,27:4,
  28:3,29:3,30:3,31:3,32:3,33:3,34:3,35:0,36:0,37:0,38:0,39:0,40:0};
// GF(256)
const EXP=new Array(512), LOG=new Array(256);
(function(){let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d;}for(let i=255;i<512;i++)EXP[i]=EXP[i-255];})();
const gmul=(a,b)=>(a===0||b===0)?0:EXP[LOG[a]+LOG[b]];
function rsPoly(n){let p=[1];for(let i=0;i<n;i++){const np=new Array(p.length+1).fill(0);for(let j=0;j<p.length;j++){np[j]^=gmul(p[j],1);np[j+1]^=gmul(p[j],EXP[i]);}p=np;}return p;}
function rsEC(data,n){const gen=rsPoly(n);const res=new Array(n).fill(0);for(const d of data){const f=d^res[0];res.shift();res.push(0);if(f!==0)for(let j=0;j<n;j++)res[j]^=gmul(gen[j+1]!==undefined?gen[j+1]:0,f);}
  // korrekte Polynomdivision
  const msg=data.concat(new Array(n).fill(0));const g=gen;
  for(let i=0;i<data.length;i++){const c=msg[i];if(c!==0)for(let j=0;j<g.length;j++)msg[i+j]^=gmul(g[j],c);}
  return msg.slice(data.length);}
function ccBits(v){return v<10?8:16;}
function fits(nbytes,ecIdx,v){let d=0;for(const b of ECC[v][ecIdx])d+=b[0]*b[2];const cap=d - Math.ceil((4+ccBits(v))/8) - 0;
  // Bit-genau prüfen
  const bits=4+ccBits(v)+8*nbytes;return bits<=d*8;}
function chooseVersion(nbytes,ecIdx,minV){for(let v=minV||1;v<=40;v++)if(fits(nbytes,ecIdx,v))return v;throw new Error("Daten zu lang für QR");}
function bitsToCodewords(bytes,ecIdx,v){
  const totalData=ECC[v][ecIdx].reduce((s,b)=>s+b[0]*b[2],0);
  const bit=[];const push=(val,len)=>{for(let i=len-1;i>=0;i--)bit.push((val>>i)&1);};
  push(4,4); push(bytes.length, ccBits(v)); for(const b of bytes)push(b,8);
  const cap=totalData*8;
  for(let i=0;i<4&&bit.length<cap;i++)bit.push(0);
  while(bit.length%8!==0)bit.push(0);
  const cw=[];for(let i=0;i<bit.length;i+=8){let x=0;for(let j=0;j<8;j++)x=(x<<1)|bit[i+j];cw.push(x);}
  const pads=[0xEC,0x11];let pi=0;while(cw.length<totalData)cw.push(pads[pi++%2]);
  return cw;
}
function interleave(cw,ecIdx,v){
  const blocks=[];let idx=0;const ecPer=[];
  const specs=ECC[v][ecIdx];
  const ecLen=specs[0][1]-specs[0][2];
  for(const spec of specs){const[nb,total,data]=spec;for(let i=0;i<nb;i++){const dd=cw.slice(idx,idx+data);idx+=data;blocks.push(dd);ecPer.push(rsEC(dd,total-data));}}
  const maxData=Math.max(...blocks.map(b=>b.length));
  const out=[];
  for(let i=0;i<maxData;i++)for(const b of blocks)if(i<b.length)out.push(b[i]);
  const maxEc=Math.max(...ecPer.map(b=>b.length));
  for(let i=0;i<maxEc;i++)for(const e of ecPer)if(i<e.length)out.push(e[i]);
  return out;
}
function buildMatrix(v){
  const n=17+4*v;const m=Array.from({length:n},()=>new Array(n).fill(null));const fn=Array.from({length:n},()=>new Array(n).fill(false));
  const setF=(r,c,val)=>{m[r][c]=val;fn[r][c]=true;};
  const finder=(r,c)=>{for(let i=-1;i<=7;i++)for(let j=-1;j<=7;j++){const rr=r+i,cc=c+j;if(rr<0||cc<0||rr>=n||cc>=n)continue;const inb=(i>=0&&i<=6&&(j===0||j===6))||(j>=0&&j<=6&&(i===0||i===6))||(i>=2&&i<=4&&j>=2&&j<=4);setF(rr,cc,inb?1:0);}};
  finder(0,0);finder(0,n-7);finder(n-7,0);
  // timing
  for(let i=8;i<n-8;i++){const b=(i%2===0)?1:0;if(m[6][i]===null)setF(6,i,b);if(m[i][6]===null)setF(i,6,b);}
  // alignment
  const ap=ALIGN[v];
  for(const r of ap)for(const c of ap){if((r<=7&&c<=7)||(r<=7&&c>=n-8)||(r>=n-8&&c<=7))continue;for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const inb=(Math.max(Math.abs(i),Math.abs(j))!==1);setF(r+i,c+j,inb?1:0);}}
  // dark module
  setF(4*v+9,8,1);
  // reserve format (near finders)
  for(let i=0;i<=8;i++){if(m[8][i]===null)fn[8][i]=true;if(m[i][8]===null)fn[i][8]=true;}
  for(let i=0;i<8;i++){fn[8][n-1-i]=true;fn[n-1-i][8]=true;}
  // reserve version info
  if(v>=7){for(let i=0;i<6;i++)for(let j=0;j<3;j++){fn[i][n-11+j]=true;fn[n-11+j][i]=true;}}
  return {m,fn,n};
}
function placeData(m,fn,n,cw){
  const bits=[];for(const b of cw)for(let i=7;i>=0;i--)bits.push((b>>i)&1);
  let idx=0,dir=-1;
  for(let col=n-1;col>0;col-=2){if(col===6)col=5;
    for(let x=0;x<n;x++){const row=dir<0?n-1-x:x;for(let c=0;c<2;c++){const cc=col-c;if(fn[row][cc])continue;m[row][cc]=idx<bits.length?bits[idx++]:0;}}
    dir=-dir;}
}
function maskFn(k){return[
  (r,c)=>(r+c)%2===0,(r,c)=>r%2===0,(r,c)=>c%3===0,(r,c)=>(r+c)%3===0,
  (r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0,(r,c)=>((r*c)%2)+((r*c)%3)===0,
  (r,c)=>(((r*c)%2)+((r*c)%3))%2===0,(r,c)=>(((r+c)%2)+((r*c)%3))%2===0][k];}
function applyMask(m,fn,n,k){const f=maskFn(k);const o=m.map(r=>r.slice());for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!fn[r][c]&&o[r][c]!==null&&f(r,c))o[r][c]^=1;return o;}
function penalty(m,n){let p=0;
  for(let r=0;r<n;r++){let run=1;for(let c=1;c<n;c++){if(m[r][c]===m[r][c-1])run++;else{if(run>=5)p+=3+(run-5);run=1;}}if(run>=5)p+=3+(run-5);}
  for(let c=0;c<n;c++){let run=1;for(let r=1;r<n;r++){if(m[r][c]===m[r-1][c])run++;else{if(run>=5)p+=3+(run-5);run=1;}}if(run>=5)p+=3+(run-5);}
  for(let r=0;r<n-1;r++)for(let c=0;c<n-1;c++){const v=m[r][c];if(v===m[r][c+1]&&v===m[r+1][c]&&v===m[r+1][c+1])p+=3;}
  const pat=[1,0,1,1,1,0,1];const pat2=[0,0,0,0];
  const check=(arr)=>{for(let i=0;i+11<=arr.length;i++){let a=true,b=true;for(let j=0;j<7;j++){if(arr[i+j]!==pat[j])a=false;}for(let j=0;j<4;j++){if(arr[i+7+j]!==0)a=false;}if(a)p+=40;
    let a2=true;for(let j=0;j<4;j++)if(arr[i+j]!==0)a2=false;for(let j=0;j<7;j++)if(arr[i+4+j]!==pat[j])a2=false;if(a2)p+=40;}};
  for(let r=0;r<n;r++)check(m[r]);
  for(let c=0;c<n;c++){const col=[];for(let r=0;r<n;r++)col.push(m[r][c]);check(col);}
  let dark=0;for(let r=0;r<n;r++)for(let c=0;c<n;c++)dark+=m[r][c];const ratio=dark*100/(n*n);const k=Math.floor(Math.abs(ratio-50)/5);p+=k*10;
  return p;}
function placeFormat(m,n,ecIdx,mask){
  const fi=FMT[ecIdx*8+mask];
  const posA=[[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],[8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]];
  const posB=[[8,n-1],[8,n-2],[8,n-3],[8,n-4],[8,n-5],[8,n-6],[8,n-7],[8,n-8],[n-7,8],[n-6,8],[n-5,8],[n-4,8],[n-3,8],[n-2,8],[n-1,8]];
  for(let i=0;i<15;i++){const b=(fi>>i)&1;m[posA[i][0]][posA[i][1]]=b;m[posB[i][0]][posB[i][1]]=b;}
}
function placeVersion(m,n,v){if(v<7)return;const vi=VER[v-7];const bits=[];for(let i=17;i>=0;i--)bits.push((vi>>i)&1);
  let idx=0;for(let i=0;i<6;i++)for(let j=0;j<3;j++){const b=bits[17-(i*3+j)];m[i][n-11+j]=b;m[n-11+j][i]=b;}}
function encode(bytesArr, ecIdx=0, minV=1){
  const v=chooseVersion(bytesArr.length,ecIdx,minV);
  const cw=interleave(bitsToCodewords(bytesArr,ecIdx,v),ecIdx,v);
  const{m,fn,n}=buildMatrix(v);
  placeData(m,fn,n,cw);
  let best=null,bestP=Infinity,bestK=0;
  for(let k=0;k<8;k++){const mm=applyMask(m,fn,n,k);placeFormat(mm,n,ecIdx,k);placeVersion(mm,n,v);const p=penalty(mm,n);if(p<bestP){bestP=p;best=mm;bestK=k;}}
  return{size:n,version:v,mask:bestK,modules:best.map(r=>r.map(x=>x===1))};
}
function encodeForced(bytesArr, ecIdx, v, k){
  const cw=interleave(bitsToCodewords(bytesArr,ecIdx,v),ecIdx,v);
  const{m,fn,n}=buildMatrix(v);placeData(m,fn,n,cw);
  const mm=applyMask(m,fn,n,k);placeFormat(mm,n,ecIdx,k);placeVersion(mm,n,v);
  return{size:n,modules:mm.map(r=>r.map(x=>x===1))};
}
function qrSVG(text, ecIdx){
  const bytes=[...new TextEncoder().encode(text)];
  const {size,modules}=encode(bytes, ecIdx==null?0:ecIdx);
  const qz=4, dim=size+2*qz; let r="";
  for(let i=0;i<size;i++)for(let j=0;j<size;j++)if(modules[i][j])r+=`<rect x="${j+qz}" y="${i+qz}" width="1" height="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" width="100%" style="max-width:280px;display:block;margin:0 auto"><rect width="${dim}" height="${dim}" fill="#fff"/><g fill="#000">${r}</g></svg>`;
}

export { qrSVG, encode };
