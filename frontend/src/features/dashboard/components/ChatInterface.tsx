import React, { useRef, useEffect, useState } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { ChatMessage } from '@/features/audio-core/hooks/useAudioRecorder';
import { Volume2, Mic, MicOff, Loader2, Sparkles, User, Send, Settings } from 'lucide-react';

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
  
  // Optional Speech settings controls for floating settings popup
  useBrowserTts?: boolean;
  toggleBrowserTts?: (val: boolean) => void;
  useBrowserStt?: boolean;
  toggleBrowserStt?: (val: boolean) => void;
  changeTtsVoiceName?: (val: string | null) => void;
  changeTtsRate?: (val: number) => void;
  availableVoices?: SpeechSynthesisVoice[];
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
  useBrowserTts,
  toggleBrowserTts,
  useBrowserStt,
  toggleBrowserStt,
  changeTtsVoiceName,
  changeTtsRate,
  availableVoices,
}: ChatInterfaceProps): React.ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showActiveSettings, setShowActiveSettings] = useState(false);

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

    // Strip structural labels like "**Passage:**", "Passage:" and markdown formatting
    const cleanedText = text
      .replace(/\*\*passage:\*\*/gi, '')
      .replace(/\bpassage:\s*/gi, '')
      .replace(/\*\*/g, '')
      .trim();

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(cleanedText);
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const textarea = form.elements.namedItem('textInput') as HTMLTextAreaElement;
    if (textarea && textarea.value.trim()) {
      sendTextMessage(textarea.value);
      textarea.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col justify-between flex-1 animate-fade-in min-h-0 relative h-full">
      
      {/* Chat Room Header / Status Indicator */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2.5 mb-2.5 px-4 sm:px-0 relative flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            status === 'LISTENING' ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse' :
            status === 'SPEAKING' ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)] animate-pulse' :
            status === 'THINKING' ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)] animate-pulse' :
            status === 'PROCESSING' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse' :
            'bg-slate-500'
          }`} />
          <span className="text-xs font-bold text-slate-200">AI Tutor Session</span>
        </div>

        {/* Quick Settings Gear for active view */}
        {toggleBrowserTts && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActiveSettings(!showActiveSettings)}
              className="p-1.5 rounded-lg border border-white/5 bg-slate-900/35 hover:bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
              title="Session Audio Settings"
            >
              <Settings className={`w-4 h-4 ${showActiveSettings ? 'rotate-45' : ''} transition-transform`} />
            </button>

            {/* Floating Dropdown settings card */}
            {showActiveSettings && (
              <div className="absolute right-0 top-8 z-50 w-64 bg-slate-950/95 border border-white/10 rounded-xl p-3.5 shadow-2xl flex flex-col gap-3.5 backdrop-blur-2xl text-left animate-fade-in">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide border-b border-white/5 pb-1.5 flex justify-between items-center">
                  <span>Session Audio Config</span>
                  <button onClick={() => setShowActiveSettings(false)} className="text-slate-500 hover:text-slate-350 font-bold px-1 text-sm">×</button>
                </div>
                
                {/* STT/TTS Selection */}
                {toggleBrowserStt && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Speech Recognition (STT)</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-900/40 p-0.5 rounded-md border border-white/5 text-[9px]">
                      <button
                        onClick={() => toggleBrowserStt(true)}
                        className={`py-1 rounded ${useBrowserStt ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-500'}`}
                      >
                        Browser
                      </button>
                      <button
                        onClick={() => toggleBrowserStt(false)}
                        className={`py-1 rounded ${!useBrowserStt ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-500'}`}
                      >
                        Whisper
                      </button>
                    </div>
                  </div>
                )}

                {toggleBrowserTts && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">AI Voice Generator (TTS)</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-900/40 p-0.5 rounded-md border border-white/5 text-[9px]">
                      <button
                        onClick={() => toggleBrowserTts(true)}
                        className={`py-1 rounded ${useBrowserTts ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-500'}`}
                      >
                        Browser
                      </button>
                      <button
                        onClick={() => toggleBrowserTts(false)}
                        className={`py-1 rounded ${!useBrowserTts ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-500'}`}
                      >
                        OpenAI
                      </button>
                    </div>
                  </div>
                )}

                {/* Voice selection (Browser TTS only) */}
                {useBrowserTts && availableVoices && changeTtsVoiceName && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Voice Accent</label>
                    <select
                      value={ttsVoiceName || ''}
                      onChange={(e) => changeTtsVoiceName(e.target.value || null)}
                      className="w-full px-2 py-1.5 rounded bg-slate-900/50 border border-white/5 text-slate-300 text-[10px] focus:outline-none"
                    >
                      <option value="">System Default</option>
                      {availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name.replace(/Microsoft|Google|Natural/g, '').trim()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rate selection (Browser TTS only) */}
                {useBrowserTts && changeTtsRate && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Voice Speed</label>
                    <select
                      value={ttsRate}
                      onChange={(e) => changeTtsRate(parseFloat(e.target.value))}
                      className="w-full px-2 py-1.5 rounded bg-slate-900/50 border border-white/5 text-slate-300 text-[10px] focus:outline-none"
                    >
                      <option value="0.8">0.8x (Slow)</option>
                      <option value="1.0">1.0x (Normal)</option>
                      <option value="1.2">1.2x</option>
                      <option value="1.5">1.5x</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Box Areas */}
      <div className="flex-1 overflow-y-auto pl-4 sm:pl-0 pr-4 sm:pr-1 flex flex-col gap-4 scroll-smooth min-h-0 mb-3">
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
                <div key={msg.id} className="mx-auto my-2 px-4 py-1.5 bg-slate-900/40 border border-white/5 text-slate-400 rounded-full text-[10px] sm:text-xs font-mono tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Topic: <span className="text-cyan-300 font-semibold">{topicName}</span>
                </div>
              );
            }

            const isUser = msg.sender === 'user';
            const isActiveAiMessage = msg.id === 'ai-current';

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 sm:gap-3 max-w-[88%] animate-fade-in ${
                  isUser ? 'self-end flex-row-reverse' : 'self-start'
                }`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-full border shrink-0 flex items-center justify-center shadow-sm ${
                  isUser 
                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-glow-blue/5'
                }`}>
                  {isUser ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  {/* Bubble Header */}
                  <div className={`text-[10px] text-slate-500 font-mono mb-1 flex items-center gap-1.5 ${isUser ? 'justify-end text-right' : 'justify-start text-left'}`}>
                    <span>{isUser ? 'You' : 'AI Tutor'}</span>
                    {!isUser && (
                      <button
                        onClick={() => playMessageText(msg.text)}
                        title="Listen Again"
                        className="p-0.5 rounded hover:bg-white/5 text-slate-500 hover:text-indigo-400 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bubble Body */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-gradient-to-br from-brand-primary-start to-brand-primary-end border border-indigo-500/10 text-white rounded-tr-none'
                        : 'bg-slate-900/40 border border-white/5 text-slate-100 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Karaoke highlighting inside active speaking AI bubble */}
                    {!isUser && isActiveAiMessage && status === 'SPEAKING' && currentPlayingSentence && (
                      <div className="mt-3 pt-2.5 border-t border-cyan-500/10 flex flex-col gap-1.5 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-wider font-bold">Speaking now:</span>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-300 flex flex-wrap gap-x-1.5 gap-y-0.5 font-light">
                          {currentPlayingSentence.split(/\s+/).map((word, idx) => {
                            const isHighlighted = idx === highlightedWordIndex;
                            return (
                              <span
                                key={idx}
                                className={`transition-all duration-150 rounded ${
                                  isHighlighted
                                    ? 'text-cyan-400 font-bold bg-cyan-500/20 px-1 scale-105 shadow-sm'
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
              </div>
            );
          })
        )}

        {/* Thinking/Generating Indicator Bubble */}
        {(status === 'THINKING' || status === 'PROCESSING') && (
          <div className="self-start max-w-[80%] flex items-start gap-2 sm:gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full border shrink-0 flex items-center justify-center bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] text-slate-500 font-mono mb-1">AI Tutor</div>
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3.5 flex gap-1.5 items-center shadow-inner">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dummy anchor for auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Readable Suggested Hint Cards */}
      {suggestions.length > 0 && (status === 'IDLE' || status === 'LISTENING') && (
        <div className="w-full border-t border-white/5 pt-3.5 pb-2 px-4 sm:px-0 flex flex-col gap-2.5 animate-fade-in text-left flex-shrink-0">
          <div className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span>Suggested Reply (Gợi ý trả lời - Click để chọn)</span>
          </div>
          
          <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(sug)}
                className="w-full text-left bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 p-3.5 rounded-xl transition-all duration-200 text-sm sm:text-base leading-relaxed text-indigo-100 font-medium cursor-pointer shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unified Input & Action Bar */}
      <div className="w-full border-t border-white/5 pt-3 sm:pt-3.5 pb-4 sm:pb-0 px-4 sm:px-0 flex-shrink-0 mt-auto">
        <form
          onSubmit={handleSubmit}
          className="w-full flex items-end gap-2 bg-slate-900/50 border border-white/10 rounded-2xl p-1.5 pl-3.5 shadow-inner relative focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all duration-300"
        >
          <textarea
            ref={textareaRef}
            name="textInput"
            placeholder="Type your reply here..."
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
            className="flex-1 bg-transparent border-0 outline-none text-slate-100 placeholder-slate-650 text-sm sm:text-base py-2.5 resize-none max-h-24 focus:ring-0 focus:outline-none leading-relaxed"
          />

          <div className="flex items-center gap-1.5 pr-1 flex-shrink-0 pb-1">
            {/* Mic trigger inside capsule */}
            {status === 'LISTENING' && stopRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="p-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white transition-all shadow-glow-listening w-8 h-8 flex items-center justify-center animate-pulse animate-halo-listening cursor-pointer"
                title="Done Speaking"
              >
                <Mic className="w-4.5 h-4.5 text-white" />
              </button>
            ) : status === 'IDLE' && startMicManual ? (
              <button
                type="button"
                onClick={startMicManual}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all w-8 h-8 flex items-center justify-center cursor-pointer"
                title="Tap to Speak"
              >
                <MicOff className="w-4.5 h-4.5" />
              </button>
            ) : (status === 'PROCESSING' || status === 'THINKING' || status === 'SPEAKING') ? (
              <div className="p-1.5 rounded-lg bg-slate-900/60 border border-white/5 w-8 h-8 flex items-center justify-center">
                <Loader2 className="w-4.5 h-4.5 animate-spin text-slate-500" />
              </div>
            ) : null}

            {/* Submit button */}
            <button
              type="submit"
              disabled={status === 'PROCESSING' || status === 'THINKING'}
              className="p-1.5 rounded-lg bg-gradient-to-r from-brand-primary-start to-brand-primary-end hover:brightness-110 disabled:from-slate-800/40 disabled:to-slate-800/40 disabled:text-slate-600 text-white transition-all shadow-glow-blue w-8 h-8 flex items-center justify-center cursor-pointer"
              title="Send Text"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
