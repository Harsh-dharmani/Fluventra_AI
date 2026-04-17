"use client";

interface AnalysisData {
  fluency_score: number;
  grammar_mistakes: { wrong: string; correct: string; explanation: string }[];
  vocabulary_level: string;
  strengths: string[];
  suggestions: string[];
  improved_sentences: { original: string; improved: string }[];
}

interface AnalysisReportProps {
  data: AnalysisData | null;
}

export default function AnalysisReport({ data }: AnalysisReportProps) {
  if (!data) return null;

  const scoreColor =
    data.fluency_score >= 7
      ? "text-green-500"
      : data.fluency_score >= 4
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <div className="space-y-6 mt-8 animate-in fade-in">
      {/* Header */}
      <div className="premium-card rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Session Analysis
            </h2>
            <span className="badge-coming-soon mt-2 inline-block">
              Vocab: {data.vocabulary_level}
            </span>
          </div>
          <div className={`text-5xl font-extrabold ${scoreColor}`}>
            {data.fluency_score}
            <span className="text-lg opacity-60">/10</span>
          </div>
        </div>
      </div>

      {/* Grammar Mistakes */}
      {data.grammar_mistakes.length > 0 && (
        <div className="premium-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            🔍 Grammar Corrections
          </h3>
          <div className="space-y-4">
            {data.grammar_mistakes.map((m, i) => (
              <div
                key={i}
                className="bg-purple-50/50 rounded-xl p-4 border-l-4 border-purple"
              >
                <p className="text-red-400 line-through text-sm">{m.wrong}</p>
                <p className="text-green-600 font-semibold text-sm mt-1">
                  {m.correct}
                </p>
                <p className="text-gray-400 text-xs mt-1 italic">
                  {m.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths + Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="premium-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            💪 Strengths
          </h3>
          <ul className="space-y-2">
            {data.strengths.map((s, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="text-green-500 mt-0.5">✓</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="premium-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            💡 Suggestions
          </h3>
          <ul className="space-y-2">
            {data.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="text-purple mt-0.5">→</span> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Improved Sentences */}
      {data.improved_sentences.length > 0 && (
        <div className="premium-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            ✨ Improved Phrasing
          </h3>
          <div className="space-y-4">
            {data.improved_sentences.map((s, i) => (
              <div
                key={i}
                className="bg-cyan/5 rounded-xl p-4 border-l-4 border-cyan"
              >
                <p className="text-gray-400 text-sm">{s.original}</p>
                <p className="text-gray-800 font-semibold text-sm mt-1">
                  → {s.improved}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
