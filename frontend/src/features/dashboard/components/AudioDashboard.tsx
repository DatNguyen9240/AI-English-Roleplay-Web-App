import React, { useState, useRef, useEffect } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { Mic, Volume2, Loader2, Play, HelpCircle } from 'lucide-react';
import { ChatMessage } from '@/features/audio-core/hooks/useAudioRecorder';
import { VoiceVisualizer } from './VoiceVisualizer';

interface AudioDashboardProps {
  isRecording: boolean;
  status: RecordingStatus;
  rmsVolume: number;
  transcript: string;
  llmText: string;
  chatHistory: ChatMessage[];
  currentPlayingSentence?: string;
  highlightedWordIndex?: number;
  startRecording: (topic?: string) => void;
  stopRecording: () => void;
  sendTextMessage: (text: string) => void;
  useBrowserTts: boolean;
  toggleBrowserTts: (val: boolean) => void;
  startMicManual: () => void;
  resetSession: () => void;
  ttsVoiceName: string | null;
  changeTtsVoiceName: (val: string | null) => void;
  ttsRate: number;
  changeTtsRate: (val: number) => void;
  availableVoices: SpeechSynthesisVoice[];
  suggestions: string[];
}

/**
 * Primary audio recording console.
 * Phase 4: Now displays both user transcript (STT) and streaming AI response (LLM).
 * Updated: Redesigned into a premium, responsive side-by-side layout (horizontal split) on desktop.
 */
export function AudioDashboard({
  status,
  rmsVolume,
  llmText,
  chatHistory,
  currentPlayingSentence,
  highlightedWordIndex,
  startRecording,
  stopRecording,
  sendTextMessage,
  useBrowserTts,
  toggleBrowserTts,
  startMicManual,
  resetSession,
  ttsVoiceName,
  changeTtsVoiceName,
  ttsRate,
  changeTtsRate,
  availableVoices,
  suggestions,
}: AudioDashboardProps): React.ReactElement {
  const [topic, setTopic] = useState('');
  const volumePercentage = Math.min(100, Math.round(rmsVolume * 500));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSuggestionClick = (text: string) => {
    if (textareaRef.current) {
      textareaRef.current.value = text;
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, llmText, status]);

  const isDisabled = status === 'PROCESSING' || status === 'THINKING' || status === 'SPEAKING';
  const isSessionActive = chatHistory.length > 0 || (status !== 'IDLE' && status !== 'ERROR');

  const startButtonLabel =
    status === 'ERROR'      ? 'Retry' :
    status === 'PROCESSING' ? 'Transcribing…' :
    status === 'THINKING'   ? 'AI is responding…' :
    status === 'SPEAKING'   ? 'AI is speaking…' :
    'Start General Conversation';

  return (
    <div className="max-w-6xl w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col transition-all duration-300">
      
      {/* App Title Header */}
      <div className="w-full border-b border-slate-800/80 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent text-center sm:text-left">
            AI English Roleplay
          </h1>
          <p className="text-xs text-slate-400 text-center sm:text-left mt-0.5">
            Practice spoken English with an interactive AI tutor.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-800/80 border border-slate-700/80 px-3.5 py-1.5 rounded-full select-none hover:bg-slate-700/80 transition-colors shadow-inner">
            <input
              type="checkbox"
              checked={useBrowserTts}
              onChange={(e) => toggleBrowserTts(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-blue-500 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <span className="text-[11px] font-semibold text-slate-300 font-sans tracking-wide">
              Browser TTS (Free Voice)
            </span>
          </label>


          {isSessionActive && (
            <div className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-350 font-mono rounded-full uppercase tracking-wider text-center">
              Active Session
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left and Right Columns */}
      <div className="w-full flex flex-col sm:flex-row gap-6 items-stretch">
        
        {/* Left Column (State, Volume Visualizer & Connection Controls) */}
        <div className="w-full sm:w-4/12 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[340px] shadow-inner">
          {!isSessionActive ? (
            /* Idle Left: Topic Input & Start */
            <div className="w-full flex flex-col justify-center h-full gap-5">
              <div className="w-full flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 text-left font-mono">
                  Custom Topic (e.g. Job Interview, Environment)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank for general chat..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isDisabled}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                id="btn-start-recording"
                onClick={() => startRecording(topic.trim() || undefined)}
                disabled={isDisabled}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-colors shadow-lg shadow-blue-500/10 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white text-white" />
                {topic.trim() ? `Start Scenario` : startButtonLabel}
              </button>

              {/* Voice Settings Card (Free Browser Voice settings) */}
              {useBrowserTts && (
                <div className="w-full mt-2 pt-4 border-t border-slate-800 flex flex-col gap-3 text-left">
                  <div className="text-[11px] font-semibold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-blue-450" />
                    Voice Settings (Giọng đọc)
                  </div>
                  
                  {/* Voice Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-sans">
                      Voice / Accent (Giọng & Phát âm)
                    </label>
                    {availableVoices.length === 0 ? (
                      <div className="text-[10px] text-amber-500 italic">
                        Loading browser voices... (Đang tải...)
                      </div>
                    ) : (
                      <select
                        value={ttsVoiceName || ''}
                        onChange={(e) => changeTtsVoiceName(e.target.value || null)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">System Default (Mặc định)</option>
                        {availableVoices.map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name.replace(/Microsoft|Google|Natural/g, '').trim()} ({voice.lang})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Speed Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-sans">
                      Reading Speed (Tốc độ đọc)
                    </label>
                    <select
                      value={ttsRate}
                      onChange={(e) => changeTtsRate(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="0.8">0.8x (Chậm)</option>
                      <option value="1.0">1.0x (Mặc định)</option>
                      <option value="1.1">1.1x</option>
                      <option value="1.2">1.2x (Nhanh vừa)</option>
                      <option value="1.3">1.3x</option>
                      <option value="1.5">1.5x (Nhanh)</option>
                      <option value="1.7">1.7x</option>
                      <option value="2.0">2.0x (Rất nhanh)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Active Left: Circle Visualizer, Guidance Badge, Volume & Exit Button */
            <div className="w-full flex flex-col items-center justify-between h-full gap-5">
              
              {/* FSM State Circle Visualizer */}
              <div className="flex flex-col items-center justify-center mt-2">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                    status === 'LISTENING'   ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]' :
                    status === 'PROCESSING' ? 'border-amber-500  shadow-[0_0_15px_rgba(245,158,11,0.3)]  animate-pulse' :
                    status === 'THINKING'   ? 'border-teal-400   shadow-[0_0_15px_rgba(45,212,191,0.3)]  animate-pulse' :
                    status === 'SPEAKING'   ? 'border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)]' :
                    'border-slate-800'
                  }`}
                  style={{
                    transform: status === 'LISTENING' ? `scale(${1 + Math.min(0.2, rmsVolume * 3.5)})` : 'scale(1)',
                    transition: 'transform 100ms ease-out, border-color 300ms, box-shadow 300ms',
                  }}
                >
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-300">
                    {status}
                  </span>
                </div>
              </div>

              {/* Dynamic Turn Guidance Badge */}
              <div className="w-full flex justify-center">
                {status === 'LISTENING' && (
                  <div className="w-full text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full flex items-center justify-center gap-2 animate-pulse font-mono uppercase tracking-wider">
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                    Your Turn: Speak now!
                  </div>
                )}
                {status === 'SPEAKING' && (
                  <div className="w-full text-center text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-full flex items-center justify-center gap-2 font-mono uppercase tracking-wider">
                    <Volume2 className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                    AI is Speaking...
                  </div>
                )}
                {status === 'THINKING' && (
                  <div className="w-full text-center text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-4 py-2 rounded-full flex items-center justify-center gap-2 font-mono uppercase tracking-wider">
                    <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                    AI is Thinking...
                  </div>
                )}
                {status === 'PROCESSING' && (
                  <div className="w-full text-center text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full flex items-center justify-center gap-2 font-mono uppercase tracking-wider">
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    Processing Voice...
                  </div>
                )}
                {status === 'IDLE' && (
                  <button
                    onClick={startMicManual}
                    className="w-full py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-lg shadow-emerald-500/10 focus:outline-none text-sm animate-pulse flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4 text-white" />
                    Tap to Speak (Nhấn để nói)
                  </button>
                )}
              </div>

              {/* Real-time Voice Spectrum Analyzer */}
              <div className="w-full px-2 flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                  <span>Voice Activity</span>
                  <span>{volumePercentage}%</span>
                </div>
                <VoiceVisualizer status={status} rmsVolume={rmsVolume} />
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2.5">
                {status === 'LISTENING' && (
                  <button
                    id="btn-stop-recording"
                    onClick={stopRecording}
                    className="w-full py-3 px-6 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-lg shadow-blue-500/10 focus:outline-none text-sm flex items-center justify-center gap-2"
                  >
                    Done Speaking / Send (Xong & Gửi đi)
                  </button>
                )}

                <button
                  onClick={resetSession}
                  className="w-full py-3 px-6 rounded-xl font-bold border border-slate-700 hover:bg-slate-800 text-slate-350 transition-colors focus:outline-none text-sm"
                >
                  Exit Session (Thoát Roleplay)
                </button>
              </div>

              {/* Voice Settings Card (Free Browser Voice settings) */}
              {useBrowserTts && (
                <div className="w-full mt-2 pt-4 border-t border-slate-800 flex flex-col gap-3 text-left">
                  <div className="text-[11px] font-semibold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-blue-450" />
                    Voice Settings (Giọng đọc)
                  </div>
                  
                  {/* Voice Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-sans">
                      Voice / Accent (Giọng & Phát âm)
                    </label>
                    {availableVoices.length === 0 ? (
                      <div className="text-[10px] text-amber-500 italic">
                        Loading browser voices... (Đang tải...)
                      </div>
                    ) : (
                      <select
                        value={ttsVoiceName || ''}
                        onChange={(e) => changeTtsVoiceName(e.target.value || null)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">System Default (Mặc định)</option>
                        {availableVoices.map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name.replace(/Microsoft|Google|Natural/g, '').trim()} ({voice.lang})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Speed Dropdown */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 font-sans">
                      Reading Speed (Tốc độ đọc)
                    </label>
                    <select
                      value={ttsRate}
                      onChange={(e) => changeTtsRate(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="0.8">0.8x (Chậm)</option>
                      <option value="1.0">1.0x (Mặc định)</option>
                      <option value="1.1">1.1x</option>
                      <option value="1.2">1.2x (Nhanh vừa)</option>
                      <option value="1.3">1.3x</option>
                      <option value="1.5">1.5x (Nhanh)</option>
                      <option value="1.7">1.7x</option>
                      <option value="2.0">2.0x (Rất nhanh)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (Dialogue Display, Subtitles, Text Drafting & User Guide) */}
        <div className="w-full sm:w-8/12 flex flex-col justify-between min-h-[340px]">
          {!isSessionActive ? (
            /* Idle Right: Quick Guide Onboard */
            <div className="w-full bg-slate-950/20 border border-slate-800/40 rounded-2xl p-6 text-left flex flex-col justify-center h-full">
              <div className="flex items-center gap-1.5 mb-4">
                <HelpCircle className="w-4.5 h-4.5 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider">
                  How It Works
                </h3>
              </div>
              <ul className="text-xs text-slate-400 space-y-3 font-sans list-decimal pl-4 leading-relaxed">
                <li>Type what topic you want to practice on the left and click <strong>Start Scenario</strong>.</li>
                <li>The AI will speak first and ask a question. Listen and read along.</li>
                <li>When the AI finishes, the mic turns on automatically. Speak your reply.</li>
                <li>Stop speaking for <strong>1.5 seconds</strong> to send, or type/paste your reply below anytime.</li>
                <li><em>Tip: Speak over the AI at any time to interrupt it!</em></li>
              </ul>
            </div>
          ) : (
            /* Active Right: Unified scrolling Conversation History & Text Input */
            <div className="w-full flex flex-col gap-4 justify-between h-full flex-1">
              
              {/* Message Box Areas */}
              <div className="flex-1 overflow-y-auto pr-1.5 max-h-[300px] flex flex-col gap-4 min-h-[220px] scroll-smooth">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-8 italic">
                    Connection established. Say hello to your AI tutor!
                  </div>
                ) : (
                  chatHistory.map((msg) => {
                    const isSystem = msg.text.startsWith('[Conversation Topic:');
                    
                    if (isSystem) {
                      const topicMatch = msg.text.match(/\[Conversation Topic:\s*(.*?)\]/);
                      const topicName = topicMatch ? topicMatch[1] : 'Custom Session';
                      return (
                        <div key={msg.id} className="mx-auto my-1 px-4 py-1.5 bg-slate-850/60 border border-slate-800/30 text-slate-400 rounded-full text-xs font-mono tracking-wide flex items-center gap-2">
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
                        <div className={`text-[10px] text-slate-500 font-mono mb-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                          {isUser ? 'You' : 'AI Tutor'}
                        </div>

                        {/* Bubble Body */}
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            isUser
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-500/20 text-white rounded-tr-none shadow-md shadow-blue-500/5'
                              : 'bg-slate-800/80 border border-slate-700/55 text-slate-100 rounded-tl-none shadow-sm'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.text}</div>

                          {/* Karaoke highlighting inside active speaking AI bubble */}
                          {!isUser && isActiveAiMessage && status === 'SPEAKING' && currentPlayingSentence && (
                            <div className="mt-3 pt-2.5 border-t border-emerald-500/10 flex flex-col gap-1.5 font-sans">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider font-bold">Speaking now:</span>
                              </div>
                              <div className="text-sm text-slate-350 flex flex-wrap gap-x-1.5 gap-y-0.5 font-light">
                                {currentPlayingSentence.split(/\s+/).map((word, idx) => {
                                  const isHighlighted = idx === highlightedWordIndex;
                                  return (
                                    <span
                                      key={idx}
                                      className={`transition-all duration-150 rounded ${
                                        isHighlighted
                                          ? 'text-emerald-350 font-bold bg-emerald-550/25 px-1 scale-105 shadow-sm shadow-emerald-500/20'
                                          : 'text-slate-300'
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
                  <div className="self-start max-w-[80%] flex flex-col">
                    <div className="text-[10px] text-slate-500 font-mono mb-1 px-1">AI Tutor</div>
                    <div className="bg-slate-855/60 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3.5 flex gap-1.5 items-center shadow-inner">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
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
                <div className="w-full border-t border-slate-850 pt-3 flex flex-col gap-1.5 animate-fadeIn text-left">
                  <div className="text-[10px] text-slate-450 font-mono tracking-wider uppercase">
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
          )}
        </div>

      </div>

      {status === 'ERROR' && (
        <p className="text-xs text-rose-400 mt-4 text-center">
          An error occurred. Make sure the backend is running and you have microphone access.
        </p>
      )}
    </div>
  );
}
