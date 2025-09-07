import React, { useMemo, useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

const DEFAULT_BANK = [
  { zh: "一(個)", en: "one", level: 1 },
  { zh: "一些", en: "some", level: 1 },
  { zh: "許多", en: "many", level: 1 },
  { zh: "能夠…的", en: "can", level: 1 },
  { zh: "關於", en: "about", level: 1 },
  { zh: "在…上方", en: "above", level: 1 },
  { zh: "在國外", en: "abroad", level: 2 },
  { zh: "在…對面", en: "across", level: 2 },
  { zh: "女演員", en: "actress", level: 1 },
  { zh: "害怕的", en: "afraid", level: 1 },
  { zh: "在…之後", en: "after", level: 1 },
  { zh: "下午", en: "afternoon", level: 1 },
  { zh: "再一次", en: "again", level: 1 },
  { zh: "年齡", en: "age", level: 1 },
  { zh: "以前", en: "ago", level: 1 },
  { zh: "同意", en: "agree", level: 2 },
  { zh: "在前方", en: "ahead", level: 2 },
  { zh: "空氣", en: "air", level: 1 },
  { zh: "飛機", en: "airplane", level: 1 },
  { zh: "機場", en: "airport", level: 1 },
  { zh: "全部的", en: "all", level: 1 },
  { zh: "幾乎", en: "almost", level: 2 },
  { zh: "沿著", en: "along", level: 2 },
  { zh: "已經", en: "already", level: 2 },
  { zh: "也", en: "also", level: 1 },
  { zh: "總是", en: "always", level: 1 },
  { zh: "上午", en: "morning", level: 1 },
  { zh: "美國", en: "America", level: 1 },
  { zh: "美國人(的)", en: "American", level: 1 },
  { zh: "和", en: "and", level: 1 },
  { zh: "生氣的", en: "angry", level: 1 },
  { zh: "動物", en: "animal", level: 1 },
  { zh: "另一個的", en: "another", level: 1 },
  { zh: "回答", en: "answer", level: 1 },
  { zh: "螞蟻", en: "ant", level: 1 },
];

function useDedupedBank(bank) {
  return useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const q of bank) {
      if (!q || !q.en || !q.zh) continue;
      const key = (q.zh + "→" + q.en).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          zh: String(q.zh).trim(),
          en: String(q.en).trim(),
          img: q.img?.trim?.() || "",
          level: Number(q.level) || 1,
        });
      }
    }
    return out;
  }, [bank]);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickOptions(correct, pool, count = 4) {
  const others = shuffle(pool.filter((w) => w.toLowerCase() !== correct.toLowerCase()));
  const need = Math.max(0, count - 1);
  return shuffle([correct, ...others.slice(0, need)]);
}

function useCountdown(msTotal, isRunning, onFinish) {
  const [msLeft, setMsLeft] = useState(msTotal || 0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => { setMsLeft(msTotal || 0); }, [msTotal]);

  useEffect(() => {
    if (!isRunning) return;
    startRef.current = performance.now();
    const tick = (now) => {
      const elapsed = now - startRef.current;
      const left = Math.max(0, (msTotal || 0) - elapsed);
      setMsLeft(left);
      if (left <= 0) { onFinish && onFinish(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [isRunning, msTotal, onFinish]);

  return msLeft;
}

function Confetti({ show }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {Array.from({ length: 60 }).map((_, i) => (
        <span
          key={i}
          className="absolute animate-[fall_2.4s_linear_infinite] top-[-10%] text-xl"
          style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 1.1}s` }}
        >
          🎉
        </span>
      ))}
      <style>{`
        @keyframes fall { 0% { transform: translateY(0) rotate(0); opacity:1 } 100% { transform: translateY(120vh) rotate(720deg); opacity:0 } }
      `}</style>
    </div>
  );
}

export default function App() {
  const [rawBank, setRawBank] = useState(DEFAULT_BANK);
  const bank = useDedupedBank(rawBank);

  // Profile & Highscore
  const STORAGE_KEY = "kvq_pro_profile_v1";
  const [profile, setProfile] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return saved || { xp: 0, totalCorrect: 0, totalPlayed: 0, best: { score: 0, percent: 0, streak: 0, at: null }, badges: {} };
    } catch {
      return { xp: 0, totalCorrect: 0, totalPlayed: 0, best: { score: 0, percent: 0, streak: 0, at: null }, badges: {} };
    }
  });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }, [profile]);

  const levelInfo = useMemo(() => {
    const req = (lv) => 100 + (lv - 1) * 20;
    let lv = 1, xpLeft = profile.xp, need = req(1);
    while (xpLeft >= need) { xpLeft -= need; lv += 1; need = req(lv); }
    return { level: lv, have: xpLeft, need, percent: Math.min(100, Math.round((xpLeft / need) * 100)) };
  }, [profile.xp]);

  // Settings
  const [levels, setLevels] = useState([1, 2, 3]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [useImages, setUseImages] = useState(false);
  const [useTimer, setUseTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);

  // Game
  const [step, setStep] = useState("setup");
  const [quiz, setQuiz] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [streak, setStreak] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [reviewOnlyWrong, setReviewOnlyWrong] = useState(false);

  const filteredBank = useMemo(() => bank.filter((q) => levels.includes(Number(q.level) || 1)), [bank, levels]);
  const englishPool = useMemo(() => filteredBank.map((q) => q.en), [filteredBank]);

  const totalMs = useMemo(() => Math.max(1, timerMinutes) * 60 * 1000, [timerMinutes]);
  const msLeft = useCountdown(totalMs, step === "playing" && useTimer, () => setStep("result"));

  const startQuiz = (source = filteredBank) => {
    const base = shuffle(source).slice(0, Math.min(numQuestions, source.length));
    const built = base.map((q) => ({ ...q, options: pickOptions(q.en, englishPool) }));
    setQuiz(built);
    setCurrent(0);
    setAnswers([]);
    setStep("playing");
    setStreak(0);
    setReviewOnlyWrong(false);
  };

  const onPick = (option) => {
    const q = quiz[current];
    const isRight = option === q.en;
    setAnswers((prev) => [...prev, { pick: option, correct: q.en, zh: q.zh }]);
    if (isRight) {
      setStreak((s) => s + 1);
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 800);
    } else {
      setStreak(0);
    }
    if (current + 1 < quiz.length) setTimeout(() => setCurrent((c) => c + 1), 260);
    else setTimeout(() => setStep("result"), 260);
  };

  const score = answers.reduce((s, a) => s + (a.pick === a.correct ? 1 : 0), 0);

  const fileInputRef = useRef(null);
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const mapped = rows.map((r) => {
      const get = (k) => r[k] ?? r[k?.toUpperCase?.()] ?? r[k?.toLowerCase?.()] ?? "";
      return {
        zh: String(get("zh") || get("中文") || get("cn") || get("question")).trim(),
        en: String(get("en") || get("英文") || get("answer") || get("ans")).trim(),
        img: String(get("img") || get("image") || get("圖片")).trim(),
        level: Number(get("level") || 1),
      };
    }).filter((r) => r.zh && r.en);
    if (mapped.length === 0) { alert("匯入失敗：請確認工作表第1頁含有欄位 zh,en（可選 img,level）"); return; }
    setRawBank(mapped);
    setStep("setup");
    setCurrent(0);
    setAnswers([]);
  };

  const progressPct = quiz.length ? Math.round((current / quiz.length) * 100) : 0;
  const wrongList = answers.map((a, i) => ({ ...a, i })).filter((a) => a.pick !== a.correct);

  useEffect(() => {
    if (numQuestions < 5) setNumQuestions(5);
    if (numQuestions > filteredBank.length) setNumQuestions(filteredBank.length);
  }, [numQuestions, filteredBank.length]);

  const restartWrong = () => {
    if (wrongList.length === 0) return;
    const wordSet = wrongList.map((w) => ({ zh: w.zh, en: w.correct }));
    startQuiz(wordSet);
    setReviewOnlyWrong(true);
  };

  const percent = quiz.length ? Math.round((score / quiz.length) * 100) : 0;
  const bestBeaten = percent > (profile.best?.percent || 0);

  useEffect(() => {
    if (step !== "result" || quiz.length === 0) return;
    let xpGain = score * 10;
    const maxStreak = (() => {
      let ms = 0, cur = 0;
      answers.forEach((a) => { if (a.pick === a.correct) { cur += 1; ms = Math.max(ms, cur); } else { cur = 0; } });
      return ms;
    })();
    xpGain += Math.max(0, (maxStreak - 2)) * 5;
    if (useTimer) {
      const secs = Math.floor(msLeft / 1000);
      xpGain += Math.min(50, Math.floor(secs / 5));
    }
    if (score === quiz.length && quiz.length > 0) xpGain += 30;

    // Leveling
    const newXP = Math.max(0, (profile.xp || 0) + xpGain);
    const req = (lv) => 100 + (lv - 1) * 20;
    let lv = 1, xpLeft = newXP, need = req(1);
    while (xpLeft >= need) { xpLeft -= need; lv += 1; need = req(lv); }

    const newBadges = { ...(profile.badges || {}) };
    if (maxStreak >= 3) newBadges.streak3 = true;
    if (maxStreak >= 5) newBadges.streak5 = true;
    if (score === quiz.length && quiz.length >= 5) newBadges.perfect = true;

    const newBest = bestBeaten ? { score, percent, streak: maxStreak, at: new Date().toISOString() } : (profile.best || { score: 0, percent: 0, streak: 0, at: null });

    setProfile((p) => ({
      ...p,
      xp: newXP,
      totalCorrect: (p.totalCorrect || 0) + score,
      totalPlayed: (p.totalPlayed || 0) + 1,
      best: newBest,
      badges: newBadges,
    }));
  }, [step]); // eslint-disable-line

  const LevelPill = ({ n }) => (
    <label className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm cursor-pointer ${levels.includes(n) ? "bg-emerald-50 border-emerald-300" : "bg-white"}`}>
      <input
        type="checkbox"
        checked={levels.includes(n)}
        onChange={(e) => setLevels((prev) => (e.target.checked ? [...new Set([...prev, n])] : prev.filter((x) => x !== n)))}
      />
      Level {n}
    </label>
  );

  const XPBar = () => (
    <div className="w-full rounded-xl border p-3 bg-white">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span>Lv.{levelInfo.level} — XP {profile.xp}</span>
        <span>Next Lv in {levelInfo.need - levelInfo.have} XP</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-amber-500 transition-all" style={{ width: `${levelInfo.percent}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-slate-500">{levelInfo.have}/{levelInfo.need} to next level</div>
    </div>
  );

  const Badge = ({ label }) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 border border-violet-200">
      ⭐ {label}
    </span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-slate-800">
      <div className="mx-auto max-w-3xl p-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">🎈 Kids Vocabulary Quiz — Pro</h1>
          <div className="text-right">
            <div className="text-xs opacity-70">Words: {filteredBank.length} / All: {bank.length}</div>
            <div className="text-xs">Best: {profile.best?.percent || 0}% (Streak {profile.best?.streak || 0})</div>
          </div>
        </header>

        <div className="mt-3"><XPBar /></div>

        {step === "setup" && (
          <section className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleImportClick} className="rounded-2xl border px-4 py-2 hover:bg-slate-50">匯入題庫 (CSV/XLSX)</button>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
              <button onClick={() => setRawBank(DEFAULT_BANK)} className="rounded-2xl border px-3 py-2 hover:bg-slate-50">還原預設題庫</button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="mb-2 text-sm font-semibold">題目設定</div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm">題數</label>
                  <input type="number" min={5} max={filteredBank.length} value={numQuestions} onChange={(e) => setNumQuestions(parseInt(e.target.value || "10", 10))} className="w-24 rounded-xl border px-3 py-2" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <LevelPill n={1} />
                  <LevelPill n={2} />
                  <LevelPill n={3} />
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="mb-2 text-sm font-semibold">進階設定</div>
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={useImages} onChange={(e) => setUseImages(e.target.checked)} /> 圖片選項（若題庫含 img 連結）
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={useTimer} onChange={(e) => setUseTimer(e.target.checked)} /> 啟用計時（整份）
                </label>
                {useTimer && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span>分鐘</span>
                    <input type="number" min={1} max={60} value={timerMinutes} onChange={(e) => setTimerMinutes(parseInt(e.target.value || "5", 10))} className="w-24 rounded-xl border px-3 py-1" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={() => startQuiz()} className="rounded-2xl bg-sky-600 px-5 py-2.5 text-white shadow hover:bg-sky-700">開始作答</button>
              <span className="text-xs text-slate-500">CSV/XLSX 欄位：zh,en,img,level（1/2/3）。</span>
            </div>
          </section>
        )}

        {step === "playing" && (
          <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-sky-500 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="text-xs tabular-nums opacity-70">{current + 1}/{quiz.length}</div>
              {useTimer && (
                <div className="ml-auto rounded-full border px-3 py-1 text-xs tabular-nums">
                  剩餘 {String(Math.floor(msLeft / 60000)).padStart(2, "0")}:{String(Math.floor((msLeft % 60000) / 1000)).padStart(2, "0")}
                </div>
              )}
            </div>

            <Confetti show={celebrate} />

            <div className="mb-2 text-sm uppercase tracking-wide text-slate-500">選英文</div>
            <div className="mb-4 text-2xl font-semibold">{quiz[current]?.zh}</div>

            <div className="grid gap-3">
              {quiz[current]?.options.map((opt, idx) => {
                const matched = filteredBank.find((x) => x.en === opt);
                const hasImg = useImages && matched?.img;
                return (
                  <button key={opt + idx} onClick={() => onPick(opt)} className="rounded-2xl border px-4 py-3 text-left transition hover:shadow-sm active:scale-[0.99]">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold">{String.fromCharCode(65 + idx)}</span>
                      {hasImg ? (
                        <div className="flex items-center gap-3">
                          <img src={matched.img} alt={opt} className="h-14 w-14 rounded-xl object-cover border" />
                          <span className="text-lg">{opt}</span>
                        </div>
                      ) : (
                        <span className="text-lg">{opt}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <div>連對：{streak} 👍</div>
              <div>已答：{answers.length}</div>
            </div>
          </section>
        )}

        {step === "result" && (
          <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-2 text-sm uppercase tracking-wide text-slate-500">結果</div>
            <div className="mb-1 text-3xl font-extrabold">分數：{score} / {quiz.length} <span className="text-xl text-slate-500">({percent}%)</span></div>
            {bestBeaten && (<div className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-amber-700 text-sm font-semibold">🎉 新紀錄！</div>)}
            <div className="mb-3 flex flex-wrap gap-2">
              {profile.badges?.perfect && <Badge label="Perfect!" />}
              {profile.badges?.streak3 && <Badge label="3 連對" />}
              {profile.badges?.streak5 && <Badge label="5 連對" />}
            </div>
            <div className="mb-6 text-slate-600">{reviewOnlyWrong ? "錯題複習回合完成！" : "做得很棒！可以再挑戰一次或只練錯題"}</div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button onClick={() => setStep("setup")} className="rounded-2xl border px-4 py-2 hover:bg-slate-50">回到設定</button>
              <button onClick={() => startQuiz()} className="rounded-2xl bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">再來一回合</button>
              <button onClick={restartWrong} disabled={wrongList.length === 0} className={`rounded-2xl px-4 py-2 text-white ${wrongList.length ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-300"}`}>錯題再練（{wrongList.length}）</button>
              <span className="ml-auto text-xs text-slate-500">最佳紀錄：{profile.best?.percent || 0}% / 連對 {profile.best?.streak || 0}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">中文</th>
                    <th className="px-3 py-2">正確英文</th>
                    <th className="px-3 py-2">你的答案</th>
                    <th className="px-3 py-2">圖片</th>
                  </tr>
                </thead>
                <tbody>
                  {quiz.map((q, i) => {
                    const a = answers[i];
                    const right = a?.pick === a?.correct;
                    const matched = filteredBank.find((x) => x.en === q.en);
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2 tabular-nums">{i + 1}</td>
                        <td className="px-3 py-2">{q.zh}</td>
                        <td className="px-3 py-2 font-semibold">{q.en}</td>
                        <td className={`px-3 py-2 ${right ? "text-emerald-600" : "text-rose-600"}`}>{a?.pick ?? "—"} {right ? "✓" : "✗"}</td>
                        <td className="px-3 py-2">
                          {matched?.img ? <img src={matched.img} alt={q.en} className="h-12 w-12 rounded-lg object-cover border" /> : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <footer className="mt-6 text-center text-xs text-slate-400">
          CSV/XLSX 欄位：zh,en,img,level（1/2/3）。若無 level 會自動視為 1。
        </footer>
      </div>
    </div>
  );
}
