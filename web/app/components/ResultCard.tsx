"use client";

export default function ResultCard({ result }: { result: any }) {
  if (!result) return null;
  const passed = !!result.match;
  return (
    <div className={`result ${passed ? "ok" : "fail"}`}>
      <div className="result-label">{passed ? "Match" : "No match"}</div>
      <div className="result-name">
        {result.match ?? result.best_candidate ?? "unknown"}
      </div>
      <div className="result-meta">
        score = {result.score} · threshold = {result.threshold}
      </div>
      {result.all && Object.keys(result.all).length > 0 && (
        <div className="scores">
          {Object.entries(result.all as Record<string, number>).map(([k, v]) => (
            <div key={k} className="score-row">
              <span>{k}</span>
              <span>{v.toFixed(4)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}