import { useState } from 'react';
import './owner-access.css';
export default function OwnerAccess({ setup }: { setup: boolean }) {
 const [username,setUsername] = useState('bixike'); const [password,setPassword] = useState(''); const [confirm,setConfirm] = useState(''); const [code,setCode] = useState(''); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
 const submit = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault(); if(busy)return; setError('');
  if(setup && password !== confirm){setError('两次输入的密码不一致。');return;}
  setBusy(true);
  try { const response = await fetch('/api/auth/'+(setup?'setup':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,...(setup?{code}:{})})}); const result = await response.json() as {error?:string}; if(!response.ok)throw new Error(result.error || '暂时无法登录。'); window.location.assign('/admin/guestbook'); }
  catch(e){setError(e instanceof Error?e.message:'暂时无法登录。');setBusy(false);}
 };
 return <main className="ag-access"><a href="/">回到庭院</a><section><p className="ag-kicker">THE GARDEN KEEPER</p><h1>{setup?'为庭院，留一把钥匙。':'月下的工作台。'}</h1><p className="ag-description">{setup?'首次设置主人账号，之后用它管理收到的留言。':'主人登录后，可以审核和管理访客留言。'}</p><form onSubmit={submit}>
 {setup&&<label>初始化码<input type="password" value={code} onChange={e=>setCode(e.target.value)} required autoComplete="off" spellCheck={false}/><small>从服务器的初始化码文件中获取。</small></label>}
 <label>用户名<input value={username} onChange={e=>setUsername(e.target.value)} required minLength={3} maxLength={24} pattern="[a-zA-Z0-9._-]{3,24}" autoComplete="username"/></label>
 <label>密码<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={12} maxLength={128} autoComplete={setup?'new-password':'current-password'}/>{setup&&<small>至少 12 个字符。</small>}</label>
 {setup&&<label>再输入一次密码<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={12} maxLength={128} autoComplete="new-password"/></label>}
 <button type="submit" disabled={busy}>{busy?'正在打开…':setup?'设置主人账号':'进入工作台'}<span aria-hidden="true">→</span></button><p role="status" aria-live="polite" className="ag-access-status">{error}</p>
 </form></section></main>;
}
