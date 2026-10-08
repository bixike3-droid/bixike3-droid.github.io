"use client";
import { useCallback, useEffect, useState } from "react";
import type { MessageStatus } from "../../../lib/guestbook";
import "./manager.css";

type Entry = { id: string; name: string; message: string; createdAt: string; status: MessageStatus };
type Settings = { requireApproval: boolean; revision: number };
type Filter = MessageStatus | "all";
type Data = { messages: Entry[]; settings: Settings; counts: Record<MessageStatus, number>; nextCursor: string | null; error?: string };
const labels: Record<MessageStatus, string> = { pending: "待审核", approved: "已公开", hidden: "已隐藏", deleted: "回收站" };
const filters: Filter[] = ["pending", "approved", "hidden", "deleted", "all"];
const emptyCounts = { pending: 0, approved: 0, hidden: 0, deleted: 0 };

function Arrow() { return <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.3" fill="none" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" /></svg>; }
export default function GuestbookManager() {
 const [filter, setFilter] = useState<Filter>("pending");
 const [messages, setMessages] = useState<Entry[]>([]);
 const [counts, setCounts] = useState(emptyCounts);
 const [settings, setSettings] = useState<Settings>({ requireApproval: true, revision: 0 });
 const [nextCursor, setNextCursor] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [busy, setBusy] = useState(false);
 const [failed, setFailed] = useState(false);
 const [notice, setNotice] = useState("");

 const load = useCallback(async (cursor?: string, signal?: AbortSignal) => {
  setLoading(true); setFailed(false);
  try {
   const query = new URLSearchParams({ status: filter }); if (cursor) query.set("cursor", cursor);
   const response = await fetch("/api/guestbook/manage?" + query, { cache: "no-store", signal });
   const data = await response.json() as Data;
   if (!response.ok || !Array.isArray(data.messages)) throw new Error(data.error || "访客簿暂时没能打开。");
   setMessages(current => cursor ? [...current, ...data.messages.filter(m => !current.some(c => c.id === m.id))] : data.messages);
   setCounts(data.counts); setSettings(data.settings); setNextCursor(data.nextCursor);
  } catch (e) {
   if (e instanceof Error && e.name === "AbortError") return;
   setFailed(true); setNotice(e instanceof Error ? e.message : "访客簿暂时没能打开。");
  } finally { if (!signal?.aborted) setLoading(false); }
 }, [filter]);
 useEffect(() => { setMessages([]); setNextCursor(null); const controller = new AbortController(); load(undefined, controller.signal); return () => controller.abort(); }, [load]);
 const update = async (body: object, success: string) => {
  if (busy) return; setBusy(true); setNotice("");
  try {
   const response = await fetch("/api/guestbook/manage", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
   const data = await response.json() as { error?: string };
   if (!response.ok) { if (response.status === 409) await load(); throw new Error(data.error || "操作暂时没能完成。"); }
   await load(); setNotice(success);
  } catch (e) { setNotice(e instanceof Error ? e.message : "操作暂时没能完成。"); }
  finally { setBusy(false); }
 };
 const change = (entry: Entry, status: MessageStatus) => update({ action: "message", id: entry.id, status, expectedStatus: entry.status }, status === "approved" ? "留言已公开，访客现在可以读到。" : status === "hidden" ? "留言已隐藏。" : status === "deleted" ? "留言已移入回收站，可以恢复。" : "留言已恢复至待审核。");
 const total = Object.values(counts).reduce((a, b) => a + b, 0);

 return <div className="gm-shell">
  <header className="gm-header"><a href="/#guestbook"><Arrow />回到庭院</a><span>主人工作台 <i /> 访客簿</span></header>
  <main className="gm-main">
   <p className="gm-eyebrow">LETTERS IN THE MOONLIGHT</p><h1>把来过的问候，<span>好好收着。</span></h1><p className="gm-intro">读一封信，留一份心意。这里由你决定哪些留言出现在庭院里。</p>
   <section className="gm-policy" aria-label="留言展示方式"><div><h2>展示方式</h2><p>{settings.requireApproval ? "新留言先进入待审核，通过后才会公开。" : "新留言提交后直接公开，你仍可随时隐藏或删除。"}</p></div><label><input type="checkbox" checked={settings.requireApproval} disabled={loading || busy || failed} onChange={e => update({ action: "settings", requireApproval: e.target.checked, revision: settings.revision }, e.target.checked ? "已开启审核后展示。" : "已开启直接展示；现有待审核留言仍需处理。")} /><span className="gm-switch" aria-hidden="true" /><span>先审核，再展示</span></label></section>
   <div className="gm-notice" role="status" aria-live="polite">{notice}</div>
   <div className="gm-toolbar"><nav aria-label="留言分类">{filters.map(f => <button key={f} aria-pressed={f === filter} disabled={busy} onClick={() => setFilter(f)}>{f === "all" ? "全部" : labels[f]}<span>{f === "all" ? total : counts[f]}</span></button>)}</nav><button className="gm-refresh" disabled={loading || busy} onClick={() => load()}>刷新</button></div>
   <section aria-label="留言列表" className="gm-list" aria-busy={loading || busy}>
    {loading && !messages.length ? <div className="gm-empty">正在打开访客簿…</div> : failed ? <div className="gm-empty"><p>访客簿暂时没能打开。</p><button onClick={() => load()}>再试一次</button></div> : !messages.length ? <div className="gm-empty"><svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="M8 12h32v24H8Z" /><path d="m8 12 16 14 16-14" /></svg><p>{filter === "pending" ? "待审核的信都读完了。" : filter === "deleted" ? "回收站里还没有留言。" : "这里暂时没有留言。"}</p></div> : messages.map(entry => <article key={entry.id} className="gm-entry"><div className="gm-entry-head"><strong>{entry.name}</strong><span className={"gm-badge gm-" + entry.status}>{labels[entry.status]}</span><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}</time></div><p>{entry.message}</p><div className="gm-entry-actions">{entry.status === "deleted" ? <button disabled={loading || busy} onClick={() => change(entry, "pending")}>恢复至待审核</button> : <>{entry.status !== "approved" && <button className="gm-primary" disabled={loading || busy} onClick={() => change(entry, "approved")}>{entry.status === "pending" ? "审核通过" : "公开留言"}</button>}{entry.status !== "hidden" && <button disabled={loading || busy} onClick={() => change(entry, "hidden")}>隐藏</button>}<button className="gm-delete" disabled={loading || busy} onClick={() => change(entry, "deleted")}>删除</button></>}</div></article>)}
   </section>
   {nextCursor && <button className="gm-more" disabled={loading || busy} onClick={() => load(nextCursor)}>{loading ? "正在读取…" : "读更早的信"}</button>}
   <p className="gm-footnote">删除的留言会留在回收站，随时可以恢复。展示方式只影响新留言。</p>
  </main>
 </div>;
}
