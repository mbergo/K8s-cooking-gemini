import React, { useState } from 'react';
import { INTERVIEW_QUESTIONS, QAData } from '../types';
import { ShieldCheck, HelpCircle, GraduationCap, ChevronRight, Activity, Zap } from 'lucide-react';

export const InterviewPrep: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(INTERVIEW_QUESTIONS[0].id);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'recruiter' | 'technical' | 'senior-staff' | 'principal'>('all');

  const filteredQuestions = INTERVIEW_QUESTIONS.filter(q => {
    if (activeCategoryFilter === 'all') return true;
    return q.category === activeCategoryFilter;
  });

  const selectedQ = INTERVIEW_QUESTIONS.find(q => q.id === selectedId) || INTERVIEW_QUESTIONS[0];

  const getCategoryTagColor = (cat: string) => {
    switch (cat) {
      case 'recruiter': return 'text-purple-400 border-purple-500/20 bg-purple-500/10';
      case 'technical': return 'text-blue-400 border-blue-500/20 bg-blue-500/10';
      case 'senior-staff': return 'text-pink-400 border-pink-500/20 bg-pink-500/10';
      case 'principal': return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
      default: return 'text-slate-400 border-slate-500/20 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-white text-2xl tracking-tight flex items-center gap-2">
          Staff-to-Principal Interview Playbook
        </h2>
        <p className="text-slate-400 text-xs max-w-3xl">
          Review core questions, whiteboard diagrams, and deep architectural talk tracks structured across interview rounds.
        </p>
      </div>

      {/* Filter Category Selectors */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#111322] border border-[#2e354f]/50 rounded-xl w-fit">
        {[
          { id: 'all', label: 'All Rounds' },
          { id: 'recruiter', label: 'Recruiter Screening' },
          { id: 'technical', label: 'Core Technical' },
          { id: 'senior-staff', label: 'Senior Staff Systems' },
          { id: 'principal', label: 'Principal Architect' }
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setActiveCategoryFilter(c.id as any);
              const matching = INTERVIEW_QUESTIONS.filter(q => c.id === 'all' || q.category === c.id);
              if (matching.length > 0) setSelectedId(matching[0].id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeCategoryFilter === c.id
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side Question Selection List */}
        <div className="lg:col-span-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredQuestions.map((q) => {
            const isSelected = selectedId === q.id;
            return (
              <button
                key={q.id}
                onClick={() => setSelectedId(q.id)}
                className={`w-full text-left p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isSelected
                    ? 'bg-gradient-to-tr from-[#141727] to-[#1e2338] border-violet-500 shadow-lg shadow-violet-500/5'
                    : 'bg-[#111322] border-[#2e354f]/50 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1.5 w-full">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${getCategoryTagColor(q.category)}`}>
                    {q.category.replace('-', ' ')}
                  </span>
                  <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-relaxed">{q.question}</h4>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? 'text-violet-400 translate-x-1' : 'text-slate-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Right Side Question Detail & Answer Walkthrough */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-[#2e354f] bg-[#111322] p-6 shadow-xl space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#1e2338]">
              <div className="space-y-1">
                <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider font-mono">Question Breakdown</span>
                <h3 className="font-display font-extrabold text-white text-md max-w-2xl leading-relaxed">
                  {selectedQ.question}
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider font-mono shrink-0 self-start sm:self-auto ${getCategoryTagColor(selectedQ.category)}`}>
                {selectedQ.category.replace('-', ' ')}
              </span>
            </div>

            {/* Answer Display */}
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-xs font-bold text-slate-200 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-violet-400" /> Recommended Answer
                </h4>
                <div className="p-4 bg-[#0c0e17]/80 border border-[#1e2338] rounded-xl text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedQ.category === 'recruiter' ? selectedQ.recruiterAnswer : selectedQ.technicalAnswer}
                </div>
              </div>

              {/* Whiteboard Layout (if exists) */}
              {selectedQ.whiteboardLayout && (
                <div>
                  <h4 className="text-xs font-bold text-slate-200 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-emerald-400" /> Proposed Whiteboard Layout
                  </h4>
                  <pre className="p-4 bg-[#07080e] border border-slate-800 rounded-xl text-emerald-400 font-mono text-[10px] leading-relaxed overflow-x-auto whitespace-pre">
                    {selectedQ.whiteboardLayout.trim()}
                  </pre>
                </div>
              )}

              {/* Staff-Level SRE Insight */}
              <div className="p-4 bg-violet-950/10 border border-violet-500/10 rounded-xl">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="h-4 w-4" /> Staff SRE Interview Insight
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  &ldquo;{selectedQ.staffInsight}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
