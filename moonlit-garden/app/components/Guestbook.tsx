"use client";
import { useEffect, useState } from "react";
type Message = { id: string; name: string; message: string; createdAt: string };
export default function Guestbook() {
 const [messages, setMessages] = useState<Message[]>([]);
 const [name, setName] = useState("");
 const [message, setMessage] = useState("");
 const [status, setStatus] = useState("");
 const [loading, setLoading] = useState(true);
 const [sending, setSending] = useState(false);
 const [failed, setFailed] = useState(false);
 const [website, setWebsite] = useState("");
 const load = async (signal?: AbortSignal) => {
  setLoading(true); setFailed(false);
  try { const response = await fetch("/api/guestbook", { signal, cache: "no-store" }); const data = await response.json() as { error?: string; messages?: Message[] }; if (!response.ok || !Array.isArray(data.messages)) throw new Error(data.error); setMessages(data.messages); }
  catch (e) { if (e instanceof Error && e.name === "AbortError") return; setFailed(true); }
  finally { setLoading(false); }
 };
 useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, []);
 const submit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault(); if (sending) return; setSending(true); setStatus("");
  try {
   const response = await fetch("/api/guestbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, message, website }) });
   const data = await response.json() as { error?: string; message?: Message }; if (!response.ok || !data.message) throw new Error(data.error || "暂时无法寄出，请稍后重试。");
   const saved = data.message;
   setMessages(current => [saved, ...current].slice(0, 50)); setMessage(""); setFailed(false); setStatus("留言已收好，谢谢你来过。");
  } catch (e) { setStatus(e instanceof Error ? e.message : "信暂时没能寄出，请稍后重试。"); }
  finally { setSending(false); }
 };
 return <div className="sg-guestbook-layout">
  <form onSubmit={submit} className="sg-letter-form">
   <label htmlFor="guest-name">怎么称呼你<input id="guest-name" value={name} onChange={e => setName(e.target.value)} required maxLength={24} autoComplete="nickname" placeholder="你的昵称" /></label>
   <label htmlFor="guest-message">留几句话<textarea id="guest-message" value={message} onChange={e => setMessage(e.target.value)} required maxLength={400} rows={3} placeholder="写下此刻想说的话……" /></label>
   <label className="sg-honey" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
   <div className="sg-form-footer"><small>{message.length} / 400</small><button type="submit" disabled={sending}>{sending ? "正在寄出…" : "寄出留言"}<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M3 12h17m-6-6 6 6-6 6" /></svg></button></div>
   <p className="sg-form-status" role="status" aria-live="polite">{status}</p>
  </form>
  <section className="sg-letters" aria-label="访客留言"><div className="sg-letters-heading"><span>庭院收到的信</span><small>最近 {messages.length} 封</small></div>
   {loading ? <p className="sg-letter-empty">正在打开访客簿…</p> : failed ? <div className="sg-letter-empty"><p>访客簿暂时没能打开。</p><button onClick={() => load()}>再试一次</button></div> : messages.length === 0 ? <p className="sg-letter-empty">还没有留言。第一封信，等你来写。</p> : <div className="sg-letters-list">{messages.map(item => <article key={item.id}><div><strong>{item.name}</strong><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" })}</time></div><p>{item.message}</p></article>)}</div>}
  </section>
 </div>;
}
