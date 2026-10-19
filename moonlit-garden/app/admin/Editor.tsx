"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Download, Eye, Flower2, Plus, Save, Trash2, Upload, X, ArrowUp, ArrowDown } from "lucide-react";
import { contentSchema, type Content } from "../../lib/content";
import GardenView from "../components/GardenView";

const draftKey = "night-garden-editor-draft-v1";
type Panel = "home" | "projects" | "notes";
export default function Editor({ initial, initialRevision }: { initial: Content; initialRevision: number }) {
  const [content, setContent] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [revision, setRevision] = useState(initialRevision);
  const [panel, setPanel] = useState<Panel>("home");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState<Content | null>(null);
  const [ready, setReady] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(content) !== baseline;
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(draftKey) || "null");
      const parsed = contentSchema.safeParse(stored?.content);
      if (parsed.success && JSON.stringify(parsed.data) !== JSON.stringify(initial)) setRecovery(parsed.data);
    } catch { /* A damaged local draft must not block the server content. */ }
    setReady(true);
  }, [initial]);
  useEffect(() => {
    if (!ready || recovery) return;
    try { if (dirty) localStorage.setItem(draftKey, JSON.stringify({ content, revision })); else localStorage.removeItem(draftKey); } catch { /* Saving to the server remains available. */ }
  }, [content, dirty, ready, recovery, revision]);
  useEffect(() => {
    const protect = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  function change<K extends keyof Content>(key: K, value: Content[K]) { setContent(c => ({ ...c, [key]: value })); setMessage(""); setError(""); }
  async function save() {
    setError(""); setMessage("");
    const normalized = { ...content, interests: content.interests.filter(Boolean), projects: content.projects.map(p => ({ ...p, tags: p.tags.filter(Boolean) })) };
    const checked = contentSchema.safeParse(normalized);
    if (!checked.success) { setError(checked.error.issues.map(i => i.path.join(".") + "：" + i.message).join("；")); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: checked.data, revision }) });
      const result = await res.json() as { error?: string; revision: number };
      if (!res.ok) throw new Error(result.error || "保存失败，请稍后重试。");
      setContent(checked.data); setRevision(result.revision); setBaseline(JSON.stringify(checked.data));
      setMessage("已保存到网站，刷新主页即可看到。");
      try { localStorage.removeItem(draftKey); } catch {}
    } catch (e) { setError(e instanceof Error ? e.message : "连接失败，你的修改还在这里。"); }
    finally { setBusy(false); }
  }
  function exportContent() {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "夜樱庭院-内容备份.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importContent(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]; event.target.value = "";
    if (!selected) return;
    if (selected.size > 600000) { setError("备份超过 600 KB，请检查文件。"); return; }
    try {
      const parsed = contentSchema.parse(JSON.parse(await selected.text()));
      if (window.confirm("用这个备份替换编辑区内容？保存后才会更新网站。")) { setContent(parsed); setMessage("备份已载入，请检查并保存。"); setError(""); setRecovery(null); }
    } catch { setError("备份格式不正确，当前内容保持原样。"); }
  }
  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]; event.target.value = "";
    if (!selected) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(selected.type) || selected.size > 250000) { setError("请选择 250 KB 以内的 PNG、JPEG 或 WebP 头像。"); return; }
    const reader = new FileReader();
    reader.onload = () => change("avatar", String(reader.result));
    reader.onerror = () => setError("头像读取失败，请重新选择。");
    reader.readAsDataURL(selected);
  }
  const split = (s: string) => s.split(/[,，]/).map(x => x.trim());
  function projectChange(index: number, patch: Partial<Content["projects"][number]>) { change("projects", content.projects.map((p, i) => i === index ? { ...p, ...patch } : p)); }
  function noteChange(index: number, patch: Partial<Content["notes"][number]>) { change("notes", content.notes.map((n, i) => i === index ? { ...n, ...patch } : n)); }
  function moveProject(index: number, direction: number) { const next = [...content.projects]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; change("projects", next); }
  return <div className="editor-shell">
    <header className="editor-header"><a href="/" onClick={e => { if (dirty && !confirm("还有未保存的修改，确定离开？")) e.preventDefault(); }}><ArrowLeft size={17} />回到庭院</a><div className="editor-actions"><span className="save-state">{dirty ? "有未保存的修改" : "内容已同步"}</span><button className="button secondary" onClick={() => setPreview(!preview)}>{preview ? <X size={15} /> : <Eye size={15} />}{preview ? "返回编辑" : "预览"}</button><button className="button save-button" onClick={save} disabled={busy || !dirty}><Save size={15} />{busy ? "正在保存…" : "保存到网站"}</button></div></header>
    {(message || error) && <div className={"editor-notice" + (error ? " error" : "")} role={error ? "alert" : "status"}>{error || message}</div>}
    {preview ? <div className="editor-preview"><div className="preview-label">预览你的修改 · 尚未保存的内容仅你可见</div><GardenView key="preview" content={content} preview /></div> : <main className="editor-main">
      <div className="editor-title"><span className="eyebrow"><Flower2 size={15} />庭院工作台</span><h1>把这里，布置成你的样子。</h1><p>改好文字，预览一下，再保存。每一处留白都由你决定。</p></div>
      {recovery && <div className="recovery-banner"><p>发现这台设备上未保存的草稿。恢复后请检查，再保存到网站。</p><div><button className="button secondary" onClick={() => { setContent(recovery); setRecovery(null); }}>恢复草稿</button><button className="text-link" onClick={() => { setRecovery(null); localStorage.removeItem(draftKey); }}>使用网站内容</button></div></div>}
      <div className="editor-tabs" role="tablist" aria-label="编辑内容">{([{ key: "home", text: "个人信息" }, { key: "projects", text: "我的作品" }, { key: "notes", text: "随手记" }] as const).map(t => <button key={t.key} id={"tab-" + t.key} role="tab" aria-selected={panel === t.key} aria-controls={"panel-" + t.key} onClick={() => setPanel(t.key)}>{t.text}</button>)}</div>
      <fieldset disabled={busy} className="editor-fields">
      <section role="tabpanel" id={"panel-" + panel} aria-labelledby={"tab-" + panel}>
      {panel === "home" && <>
        <div className="field-grid"><label>名字<input value={content.name} maxLength={40} onChange={e => change("name", e.target.value)} /></label><label>GitHub 链接<input type="url" value={content.github} onChange={e => change("github", e.target.value)} /></label></div>
        <label>首页标题<small>换行会保留在首屏</small><textarea rows={2} value={content.title} maxLength={70} onChange={e => change("title", e.target.value)} /></label>
        <label>首页简介<input value={content.subtitle} maxLength={180} onChange={e => change("subtitle", e.target.value)} /></label>
        <label>关于我<small>这里的初始介绍可以完全重写，写你真正想分享的事</small><textarea rows={7} value={content.about} maxLength={3000} onChange={e => change("about", e.target.value)} /></label>
        <label>兴趣标签<small>用逗号隔开，最多 12 个</small><input value={content.interests.join("，")} onChange={e => change("interests", split(e.target.value))} /></label>
        <label>最近在做<input value={content.now} maxLength={200} onChange={e => change("now", e.target.value)} /></label>
        <div className="field-grid"><label>邮箱<small>留空就不显示</small><input type="email" value={content.email} onChange={e => change("email", e.target.value)} /></label><div className="avatar-field"><span>头像</span><small>250 KB 以内的 PNG / JPEG / WebP</small><div>{content.avatar && <img src={content.avatar} alt="当前头像" />}<label className="button secondary upload-button"><Upload size={14} />选择头像<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} /></label>{content.avatar && <button className="text-link" onClick={() => change("avatar", "")}>移除</button>}</div></div></div>
        <label>页尾留言<input value={content.footer} maxLength={200} onChange={e => change("footer", e.target.value)} /></label>
      </>}
      {panel === "projects" && <><div className="panel-intro"><p>只展示你想展示的作品，顺序也由你决定。</p><button className="button secondary" disabled={content.projects.length >= 12} onClick={() => change("projects", [...content.projects, { id: crypto.randomUUID(), name: "新的作品", summary: "", tags: [], url: "", demo: "", featured: false }])}><Plus size={15} />添加作品</button></div>{content.projects.map((p, i) => <div className="editor-item" key={p.id}><div className="item-toolbar"><span>作品 {String(i + 1).padStart(2, "0")}</span><div><button disabled={i === 0} onClick={() => moveProject(i, -1)} aria-label={"上移 " + p.name}><ArrowUp size={16} /></button><button disabled={i === content.projects.length - 1} onClick={() => moveProject(i, 1)} aria-label={"下移 " + p.name}><ArrowDown size={16} /></button><button onClick={() => { if (confirm("删除“" + p.name + "”？保存后才会更新网站。")) change("projects", content.projects.filter((_, j) => j !== i)); }} aria-label={"删除 " + p.name}><Trash2 size={16} /></button></div></div><label>作品名称<input value={p.name} maxLength={100} onChange={e => projectChange(i, { name: e.target.value })} /></label><label>作品说明<textarea rows={4} value={p.summary} maxLength={1000} onChange={e => projectChange(i, { summary: e.target.value })} /></label><div className="field-grid"><label>项目链接<input type="url" value={p.url} onChange={e => projectChange(i, { url: e.target.value })} /></label><label>体验 / 下载链接<input type="url" value={p.demo} onChange={e => projectChange(i, { demo: e.target.value })} /></label></div><label>标签<small>用逗号隔开，最多 8 个</small><input value={p.tags.join("，")} onChange={e => projectChange(i, { tags: split(e.target.value) })} /></label><label className="check-label"><input type="checkbox" checked={p.featured} onChange={e => projectChange(i, { featured: e.target.checked })} />标记为精选作品</label></div>)}{!content.projects.length && <p className="editor-empty">还没有作品，点“添加作品”开始。</p>}</>}
      {panel === "notes" && <><div className="panel-intro"><p>记录一件小事，或留下一个想法。主页按日期从新到旧排列。</p><button className="button secondary" disabled={content.notes.length >= 40} onClick={() => { const now = new Date(); const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); change("notes", [{ id: crypto.randomUUID(), title: "今天的一点想法", date, text: "" }, ...content.notes]); }}><Plus size={15} />写一则</button></div>{content.notes.map((n, i) => <div className="editor-item" key={n.id}><div className="item-toolbar"><span>随手记 {String(i + 1).padStart(2, "0")}</span><button aria-label={"删除 " + n.title} onClick={() => { if (confirm("删除“" + n.title + "”？保存后才会更新网站。")) change("notes", content.notes.filter((_, j) => j !== i)); }}><Trash2 size={16} /></button></div><div className="field-grid"><label>标题<input value={n.title} maxLength={100} onChange={e => noteChange(i, { title: e.target.value })} /></label><label>日期<input type="date" value={n.date} onChange={e => noteChange(i, { date: e.target.value })} /></label></div><label>正文<textarea rows={8} value={n.text} maxLength={5000} onChange={e => noteChange(i, { text: e.target.value })} /></label></div>)}{!content.notes.length && <p className="editor-empty">第一片花瓣，就从今天写起。</p>}</>}
      </section></fieldset>
      <div className="backup-tools"><div><h2>把内容好好收着。</h2><p>导出备份包含文字和头像，随时可以重新导入。</p></div><div><button className="button secondary" onClick={exportContent}><Download size={14} />导出备份</button><button className="button secondary" disabled={busy} onClick={() => file.current?.click()}><Upload size={14} />导入备份</button><input ref={file} type="file" accept=".json,application/json" hidden onChange={importContent} /></div></div>
      <p className="editor-footnote"><Check size={13} />保存后的内容存放在网站数据库；本机草稿只用于找回未保存的修改。</p>
    </main>}
  </div>;
}
