import assert from "node:assert/strict";
// Run only against loopback development. The original content is restored.
const origin = process.argv[2] || "http://127.0.0.1:5173";
assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const login = await fetch(origin + "/signin-with-chatgpt?return_to=/admin", { redirect: "manual" });
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert(cookie, "Local sign-in must return a development cookie");
await fetch(origin + "/admin", { headers: { Cookie: cookie } });
const initial = await (await fetch(origin + "/api/content")).json();
const put = (body, options = {}) => fetch(origin + "/api/content", {
 method: "PUT", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie, ...options },
 body: JSON.stringify(body),
});
let latest = initial.revision;
try {
 const body = { content: initial.content, revision: latest };
 assert.equal((await put(body, { Cookie: "" })).status, 401, "Anonymous write rejected");
 assert.equal((await put(body, { Cookie: "", "oai-authenticated-user-id": "local_seedy", "oai-authenticated-user-email": "seedy@sites.test" })).status, 401, "Forged identity rejected");
 assert.equal((await put(body, { Origin: "https://untrusted.example" })).status, 403, "Cross-origin write rejected");
 assert.equal((await put({ ...body, content: { ...body.content, github: "javascript:alert(1)" } })).status, 400, "Unsafe links rejected");
 assert.equal((await put({ ...body, content: { ...body.content, notes: [{ id: "bad", title: "date", date: "2026-02-30", text: "" }] } })).status, 400, "Invalid dates rejected");
 const testContent = { ...initial.content, notes: [{ id: "verification-note", title: "验证用随手记", date: "2026-10-06", text: "保存与展示验证。<script>alert(1)</script>" }] };
 const concurrent = await Promise.all([put({ content: testContent, revision: latest }), put({ content: testContent, revision: latest })]);
 assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409], "Concurrent edits must not overwrite");
 latest = (await concurrent.find(r => r.status === 200).json()).revision;
 const persisted = await (await fetch(origin + "/api/content")).json();
 assert.deepEqual(persisted.content, testContent, "Content survives a separate request");
 const html = await (await fetch(origin + "/")).text();
 assert(html.includes("验证用随手记"), "Homepage reads saved notes");
 assert(!html.includes("<script>alert(1)</script>"), "User text cannot execute HTML");
 console.log("PASS: anonymous/forged identity, CSRF, link/date validation, concurrency, persistence, homepage rendering.");
} finally {
 const restored = await put({ content: initial.content, revision: latest });
 assert.equal(restored.status, 200, "Restore original content after verification");
 console.log("Original garden content restored.");
}
