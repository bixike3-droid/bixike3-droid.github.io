"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
 return <main className="access-message"><span className="eyebrow">夜樱庭院</span><h1>灯还亮着，稍等一下。</h1><p>这次没能读到庭院内容，请稍后重试。</p><button className="button" onClick={reset}>重新打开</button></main>;
}