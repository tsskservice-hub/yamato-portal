import React from "react";
import { Lightbulb, X } from "lucide-react";

export interface ElaborateHintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ElaborateHintModal: React.FC<ElaborateHintModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
            <Lightbulb size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Elaboration Hint Patterns
            </h3>
            <p className="text-xs text-slate-500">
              A guide on how to expand your writing based on your first sentence
            </p>
          </div>
        </div>

        {/* Pattern List */}
        <div className="space-y-4 my-6">
          {/* Pattern 1 */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <h4 className="font-bold text-sm text-indigo-900 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded text-xs font-semibold">
                Pattern 1
              </span>
              Reason + Personal Experience
            </h4>
            <div className="text-xs text-slate-700 mt-2 space-y-1">
              <p>
                ・<strong>Sentence 2:</strong> Write the reason why you think so
              </p>
              <p className="text-slate-500 pl-3">
                Example: "Because practicing every day and getting a little better is fun."
              </p>
              <p>
                ・<strong>Sentence 3:</strong> Write an actual experience you had
              </p>
              <p className="text-slate-500 pl-3">
                Example: "In last year's tournament, we made a come-from-behind win and I was so happy."
              </p>
            </div>
          </div>

          {/* Pattern 2 */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded text-xs font-semibold">
                Pattern 2
              </span>
              5W1H (Context) + Feelings
            </h4>
            <div className="text-xs text-slate-700 mt-2 space-y-1">
              <p>
                ・<strong>Sentence 2:</strong> Write context like when, where, and with whom
              </p>
              <p className="text-slate-500 pl-3">
                Example: "Every Sunday, I practice with my friends at the local park."
              </p>
              <p>
                ・<strong>Sentence 3:</strong> Write your feelings or changes at that time
              </p>
              <p className="text-slate-500 pl-3">
                Example: "I feel tired after practice, but I have a great sense of fulfillment."
              </p>
            </div>
          </div>

          {/* Pattern 3 */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
            <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-xs font-semibold">
                Pattern 3
              </span>
              Comparison with the Past + Future Goals
            </h4>
            <div className="text-xs text-slate-700 mt-2 space-y-1">
              <p>
                ・<strong>Sentence 2:</strong> Reflect on how it used to be in the past
              </p>
              <p className="text-slate-500 pl-3">
                Example: "When I first started, I couldn't do it well and almost gave up many times."
              </p>
              <p>
                ・<strong>Sentence 3:</strong> Write about your current self or future enthusiasm
              </p>
              <p className="text-slate-500 pl-3">
                Example: "Now I'm glad I kept going, and I want to improve even more."
              </p>
            </div>
          </div>

          {/* Pattern 4 */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
            <h4 className="font-bold text-sm text-purple-900 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded text-xs font-semibold">
                Pattern 4
              </span>
              Core Reason + Alternative Perspective / Exception
            </h4>
            <div className="text-xs text-slate-700 mt-2 space-y-1">
              <p>
                ・<strong>Sentence 2:</strong> Write the core reason you want to convey most
              </p>
              <p className="text-slate-500 pl-3">
                Example: "Because I believe it is important to express my thoughts in my own words."
              </p>
              <p>
                ・<strong>Sentence 3:</strong> Broaden the perspective with "However, sometimes..."
              </p>
              <p className="text-slate-500 pl-3">
                Example: "Sometimes our opinions clash, but discussing them deepens our understanding."
              </p>
            </div>
          </div>
        </div>

        {/* Writing Rule Reminders */}
        <div className="bg-slate-100 p-4 rounded-2xl text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800 mb-1">📌 Writing Rule Guidelines</p>
          <p>
            ・Please write at least <strong className="text-slate-800">10 characters</strong> per sentence.
          </p>
          <p>
            ・Single-word responses like "Yes" or "No" will not be counted.
          </p>
        </div>

        {/* Close Button */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-md"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ElaborateHintModal;