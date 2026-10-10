// 中文字宽实测结论（2026-10-10；本机 Edge/WebView2 Chromium 154，Windows，13px）
// 实测：单个拉丁 7.147px、单个中日韩 13.000px、比值 1.8188、与 2 倍的差值 1.295px
// 判定：FAIL（阈值 < 0.1px）——中文列与拉丁列对不齐，列编辑（FR-14）会错位。
// 结论待设计裁定：2:1 需要拉丁等宽字的前进宽度恰为 0.5em，
// 当前 Consolas 系（Consolas 0.55em、Cascadia Mono 0.586em）在数学上不可能满足。
// 换字体栈属设计变更，不在此处自行改动。
const MONO_FONT = 'Consolas, "Cascadia Mono", "Microsoft YaHei", monospace';
const SIZE = 13;
const LATIN = "MMMMMMMMMM"; // 10 个拉丁字符
const CJK = "中文汉字测试文本".slice(0, 10); // 10 个中日韩字符

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("无法取得 2D 上下文");

const widthOf = (text: string) => {
  ctx.font = `${SIZE}px ${MONO_FONT}`;
  return ctx.measureText(text).width;
};

const latinPer = widthOf(LATIN) / [...LATIN].length;
const cjkPer = widthOf(CJK) / [...CJK].length;
const ratio = cjkPer / latinPer;
const delta = Math.abs(cjkPer - latinPer * 2);
const pass = delta < 0.1;

const rows: [string, string][] = [
  ["候选字体栈", MONO_FONT],
  ["字号", `${SIZE}px`],
  ["单个拉丁字符宽度", `${latinPer.toFixed(3)}px`],
  ["单个中日韩字符宽度", `${cjkPer.toFixed(3)}px`],
  ["比值（应为 2）", ratio.toFixed(4)],
  ["与 2 倍的差值（应 < 0.1px）", `${delta.toFixed(3)}px`],
  ["结论", pass ? "PASS" : "FAIL"],
];

document.querySelector("#out")!.innerHTML =
  `<table><tbody>${rows
    .map(([k, v], i) => {
      const cls = i === rows.length - 1 ? (pass ? "pass" : "fail") : "";
      return `<tr><td>${k}</td><td class="${cls}">${v}</td></tr>`;
    })
    .join("")}</tbody></table>` +
  (pass
    ? ""
    : `<p class="fail">需更换等宽字体栈。候选：<code>Sarasa Mono SC</code>（需确认授权与是否随包分发）或在栈中显式指定中日韩等宽回退字体。</p>`);

console.table(Object.fromEntries(rows));
