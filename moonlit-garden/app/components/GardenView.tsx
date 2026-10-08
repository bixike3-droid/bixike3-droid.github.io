"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, GitBranch as Github, Mail, Moon, Sparkles, X, Feather, Flower2, BookOpen, Pencil, Pause, Play } from "lucide-react";
import type { Content } from "../../lib/content";

const petals = Array.from({ length: 12 }, (_, i) => ({ left: (i * 17 + 13) % 100, delay: -(i * 3.7), duration: 18 + i % 5 * 3, size: 7 + i % 4 * 2 }));
export default function GardenView({ content: c, canEdit = false, preview = false }: { content: Content; canEdit?: boolean; preview?: boolean }) {
  const [motion, setMotion] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");
  const [note, setNote] = useState<Content["notes"][number] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const stored = localStorage.getItem("garden-motion");
    setMotion(stored === "off" ? false : !reduced.matches);
    const changed = () => { if (reduced.matches) setMotion(false); };
    reduced.addEventListener("change", changed);
    const scroll = () => setScrolled(window.scrollY > 40);
    scroll(); window.addEventListener("scroll", scroll, { passive: true });
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: "-15% 0px -65% 0px" });
    document.querySelectorAll("[data-section]").forEach(e => observer.observe(e));
    return () => { reduced.removeEventListener("change", changed); window.removeEventListener("scroll", scroll); observer.disconnect(); };
  }, []);
  useEffect(() => { if (note && !dialog.current?.open) dialog.current?.showModal(); }, [note]);
  const toggleMotion = () => { setMotion(!motion); localStorage.setItem("garden-motion", motion ? "off" : "on"); };
  const nav = [{ id: "about", text: "关于我" }, { id: "works", text: "作品" }, { id: "notes", text: "随手记" }];
  const notes = [...c.notes].sort((a, b) => b.date.localeCompare(a.date));
  return <div className={"garden-site" + (preview ? " is-preview" : "")}>
    <a className="skip-link" href="#about">跳到正文</a>
    <header className={"site-header" + (scrolled ? " scrolled" : "")}>
      <a href="#home" className="wordmark" aria-label={c.name + "，回到首页"}>{c.name}<span className="wordmark-dot">.</span></a>
      <nav id="mobile-menu" aria-label="主要导航" className={menu ? "open" : ""}>
        {nav.map(n => <a key={n.id} href={"#" + n.id} aria-current={active === n.id ? "location" : undefined} onClick={() => setMenu(false)}>{n.text}</a>)}
        {c.github && <a className="nav-github" href={c.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub（新窗口）"><Github size={17} /></a>}
      </nav>
      <button className="menu-toggle" aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu(!menu)}>{menu ? "收起" : "目录"}<span>{menu ? "−" : "+"}</span></button>
    </header>
    <main>
      <section id="home" data-section className="hero">
        <picture className="hero-art"><source media="(max-width: 600px)" srcSet="/assets/night-sakura-mobile.webp" /><img src="/assets/night-sakura.webp" alt="月光下盛开的樱花树，木椅旁的一盏灯照亮小路" fetchPriority="high" /></picture>
        <div className="hero-shade" />
        {motion && <div className="petals" aria-hidden="true">{petals.map((p, i) => <i key={i} style={{ left: p.left + "%", "--delay": p.delay + "s", "--duration": p.duration + "s", "--size": p.size + "px" } as CSSProperties} />)}</div>}
        <div className="hero-copy">
          <p className="eyebrow hero-label"><span />夜樱庭院</p>
          <h1>{c.title}</h1><p className="hero-subtitle">{c.subtitle}</p>
          <a className="button hero-button" href="#about">进来坐坐<ArrowDown size={15} /></a>
        </div>
        <div className="hero-foot"><span>一盏灯 · 一处小天地</span><a href="#about" aria-label="向下探索"><span className="scroll-line" />慢慢往下看</a><button className="motion-control" onClick={toggleMotion} aria-pressed={motion} aria-label={motion ? "关闭花瓣动效" : "开启花瓣动效"}>{motion ? <Pause size={12} /> : <Play size={12} />}花瓣{motion ? "飘落中" : "已暂停"}</button></div>
      </section>
      <div className="garden-body">
        <section id="about" data-section className="section about-section">
          <div className="section-heading"><span className="eyebrow"><span className="section-no">01</span>关于我</span><h2>很高兴，你找到这里。</h2></div>
          <div className="about-grid">
            <aside className="profile">
              <div className="avatar">{c.avatar ? <img src={c.avatar} alt={c.name + "的头像"} /> : <><Moon size={37} strokeWidth={1} /><i /><i /><i /></>}</div>
              <h3>{c.name}</h3><span className="profile-caption">这座庭院的主人</span>
              <div className="profile-links">{c.github && <a href={c.github} target="_blank" rel="noopener noreferrer" aria-label="访问 GitHub"><Github size={17} /></a>}{c.email && <a href={"mailto:" + c.email} aria-label="发送邮件"><Mail size={17} /></a>}</div>
            </aside>
            <div className="about-copy">
              <div className="prose">{c.about || "关于我的故事，慢慢写。"}</div>
              {c.interests.length > 0 && <div className="interest-row"><span>一些喜欢的事</span><div>{c.interests.map((t, i) => <span className="tag" key={i}>{t}</span>)}</div></div>}
              {c.now && <div className="now-note"><span className="now-dot" /><span><small>最近在做</small>{c.now}</span><Feather size={20} strokeWidth={1} /></div>}
            </div>
          </div>
        </section>
        <div className="section-divider"><span /><Flower2 size={18} strokeWidth={1} /><span /></div>
        <section id="works" data-section className="section works-section">
          <div className="section-heading heading-row"><div><span className="eyebrow"><span className="section-no">02</span>我的作品</span><h2>把想法，做成小东西。</h2></div><p>一些实践，一些探索。<br />都从一个“想试试看”开始。</p></div>
          <div className="project-list">{c.projects.map((p, index) => <article className={"project" + (p.featured ? " featured" : "")} key={p.id}>
            <div className="project-art">
              {p.id === "edge-question-assistant" ? <div className="extension-art" aria-label="题解侧栏功能示意">
                <div className="mock-web"><div className="mock-dots"><i /><i /><i /><span>一道题，一点思路</span></div><div className="mock-page"><span className="mock-overline">QUESTION</span><div className="formula">x² − 5x + 6 = 0</div><div className="capture-frame"><span /><span /><span /><span /><small>框选你的问题</small></div><div className="mock-lines"><i /><i /><i /></div></div></div>
                <div className="mock-panel"><div className="mock-panel-title"><Sparkles size={16} /><strong>题解侧栏</strong><span>···</span></div><div className="mock-chip">分步讲解</div><p>从这一步开始。</p><div className="mock-answer"><small>把问题拆开，慢慢看清。</small><div className="mock-lines"><i /><i /><i /></div><span className="mock-result">x = 2 或 x = 3</span></div><div className="mock-input">继续追问…<ArrowUpRight size={14} /></div></div>
                <span className="art-caption">功能示意</span>
              </div> : <div className="generic-project"><Flower2 size={52} strokeWidth={.8} /><span>{String(index + 1).padStart(2, "0")}</span><p>{p.name}</p></div>}
            </div>
            <div className="project-copy"><span className="eyebrow">{p.featured ? "精选作品" : "小小实践"}<span className="project-index">{String(index + 1).padStart(2, "0")}</span></span><h3>{p.name}</h3><p>{p.summary}</p><div className="project-tags">{p.tags.map((t, i) => <span key={i}>{t}</span>)}</div><div className="project-links">{p.url && <a href={p.url} target="_blank" rel="noopener noreferrer">看看项目<ArrowUpRight size={16} /></a>}{p.demo && <a className="subtle-link" href={p.demo} target="_blank" rel="noopener noreferrer">{p.id === "edge-question-assistant" ? "下载扩展" : "打开体验"}<ArrowUpRight size={14} /></a>}</div></div>
          </article>)}</div>
          {!c.projects.length && <div className="quiet-empty"><Flower2 size={30} strokeWidth={1} /><p>新的想法，还在慢慢生长。</p></div>}
        </section>
        <section id="notes" data-section className="section notes-section">
          <div className="section-heading heading-row"><div><span className="eyebrow"><span className="section-no">03</span>随手记</span><h2>捡起日常里的几片花瓣。</h2></div><span className="notes-count">{notes.length ? notes.length + " 则记录" : "留白，也是生活的一部分"}</span></div>
          {notes.length ? <div className="notes-list">{notes.map(n => <button className="note-row" key={n.id} onClick={() => setNote(n)}><time dateTime={n.date}>{n.date.replaceAll("-", ".")}</time><div><h3>{n.title}</h3><p>{n.text.slice(0, 110)}{n.text.length > 110 ? "…" : ""}</p></div><ArrowUpRight size={20} strokeWidth={1} /></button>)}</div> : <div className="empty-notebook"><BookOpen size={33} strokeWidth={1} /><h3>这一页，先留给明天。</h3><p>日常和想法，会慢慢写在这里。</p>{canEdit && <a className="text-link" href="/admin">写下第一则随手记<ArrowUpRight size={14} /></a>}</div>}
        </section>
        <footer className="site-footer"><div className="footer-flower"><Flower2 size={27} strokeWidth={.8} /></div><p className="footer-message">{c.footer}</p><div className="footer-links">{c.github && <a href={c.github} target="_blank" rel="noopener noreferrer"><Github size={15} />GitHub<ArrowUpRight size={12} /></a>}{c.email && <a href={"mailto:" + c.email}><Mail size={15} />写封信</a>}</div><div className="footer-bottom"><span>© {new Date().getUTCFullYear()} {c.name} · 夜樱庭院</span><div>{canEdit && <a href="/admin"><Pencil size={12} />布置庭院</a>}<a href="#home">回到树下 ↑</a></div></div></footer>
      </div>
    </main>
    <dialog ref={dialog} className="note-dialog" onClose={() => setNote(null)} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      {note && <><button className="dialog-close" onClick={() => dialog.current?.close()} aria-label="关闭随手记"><X size={20} /></button><span className="eyebrow">随手记 · <time dateTime={note.date}>{note.date.replaceAll("-", ".")}</time></span><h2>{note.title}</h2><div className="prose">{note.text || "留一点空白。"}</div><Flower2 className="note-end" size={20} strokeWidth={1} /></>}
    </dialog>
  </div>;
}
