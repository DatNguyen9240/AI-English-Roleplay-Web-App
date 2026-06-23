import React, { useRef, useEffect } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { ChatMessage } from '@/features/audio-core/hooks/useAudioRecorder';
import { Volume2, Mic, MicOff, Loader2 } from 'lucide-react';

interface ChatInterfaceProps {
  chatHistory: ChatMessage[];
  status: RecordingStatus;
  currentPlayingSentence?: string;
  highlightedWordIndex?: number;
  sendTextMessage: (text: string) => void;
  suggestions: string[];
  ttsVoiceName: string | null;
  ttsRate: number;
  startMicManual?: () => void;
  stopRecording?: () => void;
}

export function ChatInterface({
  chatHistory,
  status,
  currentPlayingSentence,
  highlightedWordIndex,
  sendTextMessage,
  suggestions,
  ttsVoiceName,
  ttsRate,
  startMicManual,
  stopRecording,
}: ChatInterfaceProps): React.ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when new messages or statuses arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, status]);

  const handleSuggestionClick = (text: string) => {
    if (textareaRef.current) {
      textareaRef.current.value = text;
      textareaRef.current.focus();
    }
  };

  const playMessageText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any active speaking
    window.speechSynthesis.cancel();

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    // Find the voice matching ttsVoiceName
    let voice: SpeechSynthesisVoice | null = null;
    const voices = window.speechSynthesis.getVoices();
    if (ttsVoiceName) {
      voice = voices.find((v) => v.name === ttsVoiceName) || null;
    }
    // Fallback: search for English voices
    if (!voice) {
      voice = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
              voices.find((v) => v.lang.startsWith('en')) ||
              null;
    }

    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = ttsRate;

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full flex flex-col gap-4 justify-between h-full flex-1 animate-fade-in">
      
      {/* Message Box Areas */}
      <div className="flex-1 overflow-y-auto pr-1.5 max-h-[300px] flex flex-col gap-4 min-h-[220px] scroll-smooth">
        {chatHistory.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8 italic font-sans">
            Connection established. Say hello to your AI tutor!
          </div>
        ) : (
          chatHistory.map((msg) => {
            const isSystem = msg.text.startsWith('[Conversation Topic:');
            
            if (isSystem) {
              const topicMatch = msg.text.match(/\[Conversation Topic:\s*(.*?)\]/);
              const topicName = topicMatch ? topicMatch[1] : 'Custom Session';
              return (
                <div key={msg.id} className="mx-auto my-1 px-4 py-1.5 bg-panel-inner border border-panel-border/30 text-slate-400 rounded-full text-xs font-mono tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Topic: <span className="text-blue-300 font-semibold">{topicName}</span>
                </div>
              );
            }

            const isUser = msg.sender === 'user';
            const isActiveAiMessage = msg.id === 'ai-current';

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  isUser ? 'self-end' : 'self-start'
                }`}
              >
                {/* Bubble Header */}
                <div className={`text-[10px] text-slate-500 font-mono mb-1 px-1 flex items-center gap-1.5 ${isUser ? 'justify-end text-right' : 'justify-start text-left'}`}>
                  <span>{isUser ? 'You' : 'AI Tutor'}</span>
                  {!isUser && (
                    <button
                      onClick={() => playMessageText(msg.text)}
                      title="Listen Again (Nghe lại)"
                      className="p-0.5 rounded hover:bg-panel-inner text-slate-400 hover:text-blue-400 transition-colors focus:outline-none flex items-center justify-center"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Bubble Body */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-br from-brand-primary-start to-brand-primary-end border border-brand-primary-start/20 text-white rounded-tr-none shadow-glow-blue'
                      : 'bg-panel-inner border border-panel-border/55 text-slate-100 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Karaoke highlighting inside active speaking AI bubble */}
                  {!isUser && isActiveAiMessage && status === 'SPEAKING' && currentPlayingSentence && (
                    <div className="mt-3 pt-2.5 border-t border-status-listening/10 flex flex-col gap-1.5 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-listening animate-ping" />
                        <span className="text-[10px] text-status-listening font-mono uppercase tracking-wider font-bold">Speaking now:</span>
                      </div>
                      <div className="text-sm text-slate-300 flex flex-wrap gap-x-1.5 gap-y-0.5 font-light">
                        {currentPlayingSentence.split(/\s+/).map((word, idx) => {
                          const isHighlighted = idx === highlightedWordIndex;
                          return (
                            <span
                              key={idx}
                              className={`transition-all duration-155 rounded ${
                                isHighlighted
                                  ? 'text-status-listening font-bold bg-status-listening/20 px-1 scale-105 shadow-sm shadow-glow-listening'
                                  : 'text-slate-400'
                              }`}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Thinking/Generating Indicator Bubble */}
        {(status === 'THINKING' || status === 'PROCESSING') && (
          <div className="self-start max-w-[80%] flex flex-col animate-fade-in">
            <div className="text-[10px] text-slate-500 font-mono mb-1 px-1">AI Tutor</div>
            <div className="bg-panel-inner border border-panel-border rounded-2xl rounded-tl-none px-4 py-3.5 flex gap-1.5 items-center shadow-inner">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-status-listening animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Dummy anchor for auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Hint / Sample Answer */}
      {suggestions.length > 0 && (status === 'IDLE' || status === 'LISTENING') && (
        <div className="w-full border-t border-panel-border/30 pt-3 flex flex-col gap-1.5 animate-fade-in text-left">
          <div className="text-[10px] text-slate-455 font-mono tracking-wider uppercase">
            Suggested Reply (Gợi ý trả lời - Click để dùng)
          </div>
          <button
            type="button"
            onClick={() => handleSuggestionClick(suggestions[0])}
            className="w-full text-xs text-slate-350 hover:text-blue-300 bg-panel-inner border border-panel-border px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 text-left shadow-sm hover:shadow leading-relaxed"
          >
            {suggestions[0]}
          </button>
        </div>
      )}

      {/* Drafting area for typed response */}
      <div className="w-full border-t border-panel-border/80 pt-4 mt-auto">
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
          className="w-full flex gap-2 sm:gap-3 items-end"
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
            className="flex-1 px-4 py-2.5 rounded-xl bg-panel-inner border border-panel-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />

          {/* Mobile-only Mic/Stop Action Button */}
          {status === 'LISTENING' && stopRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="sm:hidden p-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-glow-listening h-[44px] w-[44px] flex items-center justify-center animate-pulse"
              title="Done Speaking (Xong)"
            >
              <Mic className="w-5 h-5 text-white" />
            </button>
          ) : status === 'IDLE' && startMicManual ? (
            <button
              type="button"
              onClick={startMicManual}
              className="sm:hidden p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-panel-border text-slate-350 transition-all h-[44px] w-[44px] flex items-center justify-center"
              title="Tap to Speak (Nói)"
            >
              <MicOff className="w-5 h-5 text-slate-400" />
            </button>
          ) : (status === 'PROCESSING' || status === 'THINKING' || status === 'SPEAKING') ? (
            <button
              type="button"
              disabled
              className="sm:hidden p-3 rounded-xl bg-slate-900/60 border border-panel-border/30 text-slate-600 h-[44px] w-[44px] flex items-center justify-center"
            >
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </button>
          ) : null}

          <button
            type="submit"
            disabled={status === 'PROCESSING' || status === 'THINKING'}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-brand-primary-start to-brand-primary-end hover:brightness-110 disabled:from-panel-inner disabled:to-panel-inner disabled:text-slate-600 text-white text-sm font-bold transition-all shadow-glow-blue focus:outline-none h-[44px] flex items-center justify-center"
          >
            Send
          </button>
        </form>
      </div>

    </div>
  );
}
