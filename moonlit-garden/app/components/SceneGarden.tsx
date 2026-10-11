"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "./scene-garden.css";
import Guestbook from "./Guestbook";
type Scene = "entrance" | "garden" | "works" | "about" | "interests" | "guestbook";
const scenes: Scene[] = ["entrance", "garden", "works", "about", "interests", "guestbook"];
const labels = { entrance: "庭院入口", garden: "庭院中央", works: "作品展室", about: "月下书桌", interests: "爱好与技能", guestbook: "庭院访客簿" };
function Icon({ name, size = 20 }: { name: string; size?: number }) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
 {name === "flower" && <><path d="M12 11C4-1 4 14 11 12C-1 19 15 23 12 13C20 24 26 9 13 12C26 4 10-2 12 11Z"/><circle cx="12" cy="12" r="1.4"/></>}
 {name === "arrow" && <path d="M3 12h17m-6-6 6 6-6 6"/>}
 {name === "moon" && <path d="M19.7 15.1A8.2 8.2 0 0 1 8.9 4.3 8.5 8.5 0 1 0 19.7 15.1Z"/>}
 {name === "pause" && <path d="M9 6v12M15 6v12"/>}
 {name === "play" && <path d="m9 5 10 7-10 7Z"/>}
 {name === "external" && <path d="M8 5H5v14h14v-3M12 5h7v7M19 5 10 14"/>}
 </svg>;
}
export default function SceneGarden() {
 const [scene,setScene]=useState<Scene>("entrance");
 const [motion,setMotion]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 const mounted=useRef(false);
 useEffect(()=>{
  const sync=()=>{const s=location.hash.slice(1);setScene(scenes.includes(s as Scene)?s as Scene:"entrance");};sync();
  const media=matchMedia("(prefers-reduced-motion: reduce)");
  try {setMotion(!media.matches&&localStorage.getItem("night-garden-motion")!=="off");} catch {setMotion(!media.matches);}
  const changed=()=>{if(media.matches)setMotion(false);};
  window.addEventListener("hashchange",sync);media.addEventListener("change",changed);
  return ()=>{window.removeEventListener("hashchange",sync);media.removeEventListener("change",changed);};
 },[]);
 useEffect(()=>{document.title=`${labels[scene]} · 夜樱庭院`;if(mounted.current)heading.current?.focus({preventScroll:true});mounted.current=true;},[scene]);
 const go=(s:Scene)=>{if(s!==scene)location.hash=s;};
 const toggle=()=>{setMotion(!motion);try{localStorage.setItem("night-garden-motion",motion?"off":"on");}catch{}};
 return <div className={`sg-world sg-${scene}${motion?" sg-motion":""}`}>
 <a className="sg-skip" href="#sg-content" onClick={e=>{e.preventDefault();heading.current?.focus();}}>跳到场景内容</a><div className="sg-landscape" aria-hidden="true">{scenes.map(s=><div key={s} className={`sg-backdrop sg-backdrop-${s}${scene===s?" is-active":""}`}/>)}</div><div className="sg-shade" aria-hidden="true"/><div className="sg-mist" aria-hidden="true"/>
 <svg className="sg-foreground" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M1650-20C1510 130 1360 150 1210 140S1030 50 850 75M1440 100C1400 170 1330 250 1220 280M1130 125C1080 165 1020 190 970 185" stroke="#1e1825" strokeWidth="14" fill="none"/><g fill="#d7a6c0" fillOpacity=".46">{Array.from({length:36},(_,i)=><ellipse key={i} cx={880+(i*73)%660} cy={58+(i*47)%190} rx={9+i%3*3} ry="5" transform={`rotate(${i*37} ${880+(i*73)%660} ${58+(i*47)%190})`}/>)}</g></svg>
 <div className="sg-petals" aria-hidden="true">{Array.from({length:16},(_,i)=><svg key={i} viewBox="0 0 20 12" style={{left:(i*23+9)%100+"%","--delay":-i*2.3+"s","--duration":19+i%5*3+"s","--size":8+i%4*3+"px"} as CSSProperties}><path d="M1 10C0 0 14-4 19 3 16 10 7 14 1 10Z" fill="currentColor"/></svg>)}</div>
 <header className="sg-header"><button className="sg-brand" onClick={()=>go("entrance")} aria-label="夜樱庭院，回到入口"><Icon name="flower" size={30}/><span>夜樱庭院<small>THE MOONLIT GARDEN</small></span></button><nav aria-label="场景导航">{(["garden","works","about","interests","guestbook"] as Scene[]).map((s,i)=><button key={s} onClick={()=>go(s)} aria-current={scene===s?"page":undefined}><small>0{i+1}</small>{s==="garden"?"庭院":s==="works"?"作品":s==="about"?"关于":s==="interests"?"爱好与技能":"留言"}</button>)}<a className="sg-github" href="https://github.com/bixike3-droid" target="_blank" rel="noopener noreferrer">GitHub<Icon name="external" size={14}/></a></nav></header>
 <main id="sg-content" className="sg-main" tabIndex={-1}><div key={scene} className={`sg-content sg-content-${scene}`}>
 {scene==="entrance"&&<><p className="sg-eyebrow"><span/>一处属于 bixike 的小天地</p><h1 ref={heading} tabIndex={-1}>今夜，<br/>樱花为你<span>停留。</span></h1><p className="sg-description">把喧嚣留在门外。<br/>沿着月光，走进我的小小庭院。</p><button className="sg-enter" onClick={()=>go("garden")}><span>进入庭院</span><Icon name="arrow" size={23}/></button><span className="sg-entry-note">循光而入 · 随心停留</span></>}
 {scene==="garden"&&<><p className="sg-eyebrow"><span/>01 / 庭院中央</p><h1 ref={heading} tabIndex={-1}>月色正好，<br/>四处<span>走走。</span></h1><p className="sg-description">作品、故事，还有日常里的喜欢。<br/>选一条小路，慢慢逛。</p><div className="sg-destinations"><button onClick={()=>go("works")}><span className="sg-destination-no">02</span><span><strong>去作品展室</strong><small>收藏那些做出来的想法</small></span><Icon name="arrow"/></button><button onClick={()=>go("about")}><span className="sg-destination-no">03</span><span><strong>去月下书桌</strong><small>认识这座庭院的主人</small></span><Icon name="arrow"/></button><button onClick={()=>go("interests")}><span className="sg-destination-no">04</span><span><strong>去收藏小屋</strong><small>爱好与技能，慢慢积累</small></span><Icon name="arrow"/></button><button onClick={()=>go("guestbook")}><span className="sg-destination-no">05</span><span><strong>写一封留言</strong><small>把来过的痕迹留在这里</small></span><Icon name="arrow"/></button></div></>}
 {scene==="works"&&<><p className="sg-eyebrow"><span/>02 / 临水展室</p><h1 ref={heading} tabIndex={-1}>给想法，<br/>一个<span>位置。</span></h1><p className="sg-description">这里将收藏我的作品。<br/>展室已经亮灯，第一件作品稍后入场。</p><a className="sg-text-link" href="https://github.com/bixike3-droid" target="_blank" rel="noopener noreferrer">先去 GitHub 看看<Icon name="external" size={16}/></a><div className="sg-exhibit-label" aria-label="作品待添加"><Icon name="flower" size={28}/><span>第一件作品</span><small>待展出</small></div></>}
 {scene==="about"&&<><p className="sg-eyebrow"><span/>03 / 月下书桌</p><h1 ref={heading} tabIndex={-1}>故事，<br/>慢慢<span>写。</span></h1><div className="sg-profile"><Icon name="moon" size={26}/><div><strong>bixike3-droid</strong><span>这座庭院的主人</span></div></div><p className="sg-description">关于我的介绍，暂且留白。<br/>先让月光落在这一页上。</p><a className="sg-text-link" href="https://github.com/bixike3-droid" target="_blank" rel="noopener noreferrer">在 GitHub 找到我<Icon name="external" size={16}/></a></>}
 {scene==="interests"&&<><p className="sg-eyebrow"><span/>04 / 收藏小屋</p><h1 ref={heading} tabIndex={-1}>喜欢的事，<br/>慢慢<span>积累。</span></h1><p className="sg-description">热爱让日常有趣，练习让想法成形。</p><div className="sg-interests-grid"><section><span className="sg-panel-kicker">PASSIONS</span><h2>我的爱好</h2><p>留给那些让我忘记时间的事。</p><div className="sg-fill-line"/><small>爱好与收藏，待填写</small></section><section><span className="sg-panel-kicker">SKILLS</span><h2>我的技能</h2><p>留给正在练习与掌握的能力。</p><div className="sg-fill-line"/><small>技能与实践，待填写</small></section></div></>}
 {scene==="guestbook"&&<><p className="sg-eyebrow"><span/>05 / 庭院访客簿</p><h1 ref={heading} tabIndex={-1}>来过，就留<span>几句话。</span></h1><p className="sg-description">一句问候，一个想法。我会在这里读到。</p><Guestbook/></>}

 </div></main>
 {scene==="garden"&&<button className="sg-scene-marker" onClick={()=>go("works")}><span className="sg-marker-ring"/><span>临水展室<small>点击前往</small></span><Icon name="arrow" size={17}/></button>}
 <aside className="sg-side-note" aria-hidden="true">{scene==="about"?"一页留白 · 万种可能":scene==="works"?"想法落地 · 微光成形":"月下有樱 · 风过无声"}</aside>
 <footer className="sg-footer"><div className="sg-location"><Icon name="moon" size={16}/><span>{labels[scene]}</span><i/><small>夜樱 · 第一章</small></div><div className="sg-scene-dots" aria-label="选择场景">{scenes.map(s=><button key={s} onClick={()=>go(s)} aria-label={labels[s]} aria-current={scene===s?"step":undefined}><span/></button>)}</div><button className="sg-motion-control" onClick={toggle} aria-pressed={motion}><Icon name={motion?"pause":"play"} size={14}/><span>{motion?"暂停动态":"开启动态"}</span></button></footer><span className="sg-sr" role="status" aria-live="polite">{labels[scene]}</span>
 </div>;
}
