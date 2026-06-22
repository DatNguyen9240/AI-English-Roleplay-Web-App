import React, { useRef } from 'react';
import { RecordingStatus } from 'shared-contracts';

interface DraftingFormProps {
  suggestions: string[];
  status: RecordingStatus;
  sendTextMessage: (text: string) => void;
}

export const DraftingForm: React.FC<DraftingFormProps> = ({
  suggestions,
  status,
  sendTextMessage,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSuggestionClick = (text: string) => {
    if (textareaRef.current) {
      textareaRef.current.value = text;
      textareaRef.current.focus();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 justify-between h-full flex-1">
      {/* Suggested Hint / Sample Answer */}
      {suggestions.length > 0 && (status === 'IDLE' || status === 'LISTENING') && (
        <div className="w-full border-t border-slate-850 pt-3 flex flex-col gap-1.5 animate-fadeIn text-left">
          <div className="text-[10px] text-slate-455 font-mono tracking-wider uppercase">
            Suggested Reply (Gợi ý trả lời - Click để dùng)
          </div>
          <button
            type="button"
            onClick={() => handleSuggestionClick(suggestions[0])}
            className="w-full text-xs text-slate-350 hover:text-blue-300 bg-slate-800/60 hover:bg-slate-700/75 border border-slate-700/80 hover:border-blue-500/60 px-4 py-3 rounded-xl transition-all duration-200 text-left shadow-sm hover:shadow leading-relaxed"
          >
            {suggestions[0]}
          </button>
        </div>
      )}

      {/* Drafting area for typed response */}
      <div className="w-full border-t border-slate-800/80 pt-4 mt-auto">
        <div className="flex justify-between text-[11px] text-slate-400 mb-2 font-mono">
          <span>Type or Paste Response</span>
          <span className="text-blue-400 font-sans">Or speak freely via Mic</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const textarea = form.elements.namedItem('textInput') as HTMLTextAreaElement;
            if (textarea && textarea.value.trim()) {
              sendTextMessage(textarea.value);
              textarea.value = '';
            }
          }}
          className="w-full flex gap-3 items-end"
        >
          <textarea
            ref={textareaRef}
            name="textInput"
            placeholder="Type or paste your English reply here... (Enter to Send)"
            disabled={status === 'PROCESSING' || status === 'THINKING'}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const form = e.currentTarget.form;
                if (form) {
                  form.requestSubmit();
                }
              }
            }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/85 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
          <button
            type="submit"
            disabled={status === 'PROCESSING' || status === 'THINKING'}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white text-sm font-bold transition-all shadow-md focus:outline-none h-[44px] flex items-center justify-center"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
