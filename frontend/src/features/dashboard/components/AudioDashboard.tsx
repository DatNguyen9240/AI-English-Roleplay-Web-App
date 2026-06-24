import React, { useState, useEffect, useRef } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { ChatMessage } from '@/features/audio-core/hooks/useAudioRecorder';
import { Mic, Send, RotateCcw, AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BlurText } from '@/components/react-bits/BlurText';

interface AudioDashboardProps {
  isRecording: boolean;
  status: RecordingStatus;
  rmsVolume: number;
  transcript: string;
  chatHistory: ChatMessage[];
  currentPlayingSentence?: string;
  highlightedWordIndex?: number;
  startRecording: (topic?: string) => void;
  stopRecording: () => void;
  startMicManual: () => void;
  sendTextMessage: (text: string) => void;
  resetSession: () => void;
  suggestions: string[];
  ttsVoiceName: string | null;
  changeTtsVoiceName: (val: string | null) => void;
  ttsRate: number;
  changeTtsRate: (val: number) => void;
  availableVoices: SpeechSynthesisVoice[];
  useBrowserTts: boolean;
  toggleBrowserTts: (val: boolean) => void;
  useBrowserStt: boolean;
  toggleBrowserStt: (val: boolean) => void;
}

export function AudioDashboard({
  isRecording,
  status,
  rmsVolume,
  transcript,
  chatHistory,
  currentPlayingSentence,
  highlightedWordIndex = -1,
  startRecording,
  stopRecording,
  startMicManual,
  sendTextMessage,
  resetSession,
  suggestions,
  ttsVoiceName,
  changeTtsVoiceName,
  ttsRate,
  changeTtsRate,
  availableVoices,
  useBrowserTts,
  toggleBrowserTts,
  useBrowserStt,
  toggleBrowserStt,
}: AudioDashboardProps): React.ReactElement {
  const [topicInput, setTopicInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const isSessionActive = chatHistory.length > 0 || (status !== 'IDLE' && status !== 'ERROR');
  const isLlmResponding = status === 'THINKING' || status === 'PROCESSING';

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, transcript, status]);

  const handleStartPractice = (e: React.FormEvent) => {
    e.preventDefault();
    startRecording(topicInput.trim() || undefined);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isLlmResponding) return;
    sendTextMessage(textInput.trim());
    setTextInput('');
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startMicManual();
    }
  };

  return (
    <div className="w-full max-w-none flex flex-col h-screen justify-between px-0 py-4 font-sans text-neutral-200">
      
      {/* 1. Header Area */}
      <header className="flex justify-between items-center py-4 px-4 sm:px-0 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-tight text-white text-lg whitespace-nowrap">AI Tutor</span>
          {isSessionActive && (
            <span className="hidden sm:inline-block text-[10px] bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono whitespace-nowrap">
              Active Session
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            variant="ghost"
            size="icon"
            title="Speech Settings"
            className={`h-8 w-8 text-neutral-400 hover:text-white transition-colors duration-250 ${
              showSettings ? 'bg-neutral-900 text-white' : ''
            }`}
          >
            <Settings className="w-4 h-4" />
          </Button>
          {isSessionActive && (
            <Button
              type="button"
              onClick={resetSession}
              variant="outline"
              size="sm"
              title="Reset practice topic"
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Topic</span>
            </Button>
          )}
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-neutral-950 border-y sm:border border-neutral-900 sm:rounded-lg p-4 mx-4 sm:mx-0 my-2 space-y-4 animate-fade-in text-left">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Speech & Audio Settings
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Voice Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider font-bold">Accent (Giọng đọc)</label>
              {!useBrowserTts ? (
                <div className="text-xs text-neutral-500 italic py-2">
                  Accent configuration requires Browser TTS enabled.
                </div>
              ) : availableVoices.length === 0 ? (
                <div className="text-xs text-neutral-500 italic">
                  Loading system voices...
                </div>
              ) : (
                <select
                  value={ttsVoiceName || ''}
                  onChange={(e) => changeTtsVoiceName(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs focus:outline-none focus:border-neutral-500 cursor-pointer"
                >
                  <option value="">System Default</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name.replace(/Microsoft|Google|Natural/g, '').trim()} ({voice.lang})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Speed Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider font-bold">Speed (Tốc độ đọc)</label>
              <select
                value={ttsRate}
                onChange={(e) => changeTtsRate(parseFloat(e.target.value))}
                disabled={!useBrowserTts}
                className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs focus:outline-none focus:border-neutral-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="0.8">0.8x (Slow)</option>
                <option value="1.0">1.0x (Normal)</option>
                <option value="1.2">1.2x</option>
                <option value="1.5">1.5x (Fast)</option>
                <option value="1.8">1.8x</option>
              </select>
            </div>
          </div>

          <div className="border-t border-neutral-900 pt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-900">
              <div className="flex flex-col gap-0.5 pr-2">
                <span className="text-xs font-semibold text-white">Browser TTS (Giọng đọc)</span>
                <span className="text-[9px] text-neutral-500">Dùng giọng nói miễn phí của trình duyệt</span>
              </div>
              <input
                type="checkbox"
                checked={useBrowserTts}
                onChange={(e) => toggleBrowserTts(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-800 bg-neutral-900 text-white focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between bg-neutral-900/50 p-2.5 rounded-lg border border-neutral-900">
              <div className="flex flex-col gap-0.5 pr-2">
                <span className="text-xs font-semibold text-white">Browser STT (Nhận diện)</span>
                <span className="text-[9px] text-neutral-500">Dùng nhận diện giọng nói trình duyệt</span>
              </div>
              <input
                type="checkbox"
                checked={useBrowserStt}
                onChange={(e) => toggleBrowserStt(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-800 bg-neutral-900 text-white focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Practice Workspace */}
      <div className="flex-1 flex flex-col min-h-0 py-6">
        {!isSessionActive ? (
          /* Start Screen (Minimalist Topic Selector) */
          <div className="flex-1 flex flex-col justify-center items-center max-w-xl mx-auto w-full px-4 sm:px-0 text-center animate-fade-in">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              <BlurText text="Practice Speaking English" delay={45} />
            </h1>
            <p className="text-sm text-neutral-400 mb-8">
              Type a custom scenario to practice roleplaying, or leave it blank to start a general chat.
            </p>
            
            <form onSubmit={handleStartPractice} className="w-full space-y-4">
              <Input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Job interview at a tech company"
                className="w-full h-11 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-neutral-500 transition-all text-sm"
              />
              <Button
                type="submit"
                className="w-full h-11 rounded-lg font-bold bg-white hover:bg-neutral-200 text-black transition-colors duration-200 text-sm flex items-center justify-center gap-2 shadow"
              >
                <span>Start Practice</span>
              </Button>
            </form>
          </div>
        ) : (
          /* Active Chat Workspace */
          <div className="flex-1 flex flex-col min-h-0 bg-neutral-950 border-y sm:border border-neutral-900 sm:rounded-xl overflow-hidden shadow-inner">
            
            {/* Scrollable messages log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((message) => {
                if (message.text.startsWith('[Conversation Topic:') && message.text.endsWith(']')) {
                  const topicName = message.text.slice('[Conversation Topic:'.length, -1).trim();
                  return (
                    <div key={message.id} className="w-full flex justify-center py-2 animate-fade-in">
                      <div className="text-[10px] px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900 text-neutral-400 font-mono uppercase tracking-wider">
                        Topic: {topicName}
                      </div>
                    </div>
                  );
                }

                const isUser = message.sender === 'user';
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col max-w-[85%] ${
                      isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                    } animate-fade-in`}
                  >
                    <div className="text-[10px] text-neutral-500 mb-1 uppercase font-mono tracking-wider">
                      {isUser ? 'You' : 'Tutor'}
                    </div>
                    <div
                      className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-neutral-800 text-white'
                          : 'bg-neutral-900/40 border border-neutral-800 text-neutral-200'
                      }`}
                    >
                      {/* Real-time word-by-word lyrics highlight for AI messages */}
                      {!isUser && currentPlayingSentence && message.text.includes(currentPlayingSentence) ? (
                        (() => {
                          const startIndex = message.text.indexOf(currentPlayingSentence);
                          const beforeText = message.text.substring(0, startIndex);
                          const afterText = message.text.substring(startIndex + currentPlayingSentence.length);
                          const words = currentPlayingSentence.split(' ');

                          return (
                            <span>
                              {beforeText && <span className="text-neutral-200">{beforeText}</span>}
                              
                              <span className="inline-flex flex-wrap gap-x-1 border-b border-dashed border-neutral-800 pb-0.5 my-0.5">
                                {words.map((word, wordIdx) => {
                                  const isPast = wordIdx < highlightedWordIndex;
                                  const isCurrent = wordIdx === highlightedWordIndex;
                                  
                                  return (
                                    <span
                                      key={wordIdx}
                                      className={`transition-all duration-150 rounded px-0.5 ${
                                        isCurrent
                                          ? 'bg-white text-black font-semibold shadow-md scale-105 inline-block mx-0.5'
                                          : isPast
                                          ? 'text-neutral-200 font-medium'
                                          : 'opacity-35 text-neutral-500 font-normal'
                                      }`}
                                    >
                                      {word}
                                    </span>
                                  );
                                })}
                              </span>

                              {afterText && <span className="opacity-35 text-neutral-500 transition-opacity duration-300">{afterText}</span>}
                            </span>
                          );
                        })()
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Real-time browser speech recognition transcript feedback */}
              {isRecording && transcript && (
                <div className="flex flex-col max-w-[85%] ml-auto items-end opacity-70 animate-fade-in">
                  <div className="text-[10px] text-neutral-500 mb-1 uppercase font-mono tracking-wider">
                    Drafting...
                  </div>
                  <div className="px-4 py-2.5 rounded-xl text-sm leading-relaxed bg-neutral-900 text-neutral-300 italic border border-neutral-800 border-dashed">
                    {transcript}
                  </div>
                </div>
              )}

              {/* AI is thinking/typing status indicator inside chat bubble */}
              {isLlmResponding && chatHistory[chatHistory.length - 1]?.sender !== 'ai' && (
                <div className="flex flex-col max-w-[80%] mr-auto items-start animate-fade-in">
                  <div className="text-[10px] text-neutral-500 mb-1 uppercase font-mono tracking-wider">
                    Tutor
                  </div>
                  <div className="px-4 py-2.5 rounded-xl text-sm bg-neutral-900/40 border border-neutral-800 text-neutral-400 italic">
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
            
            {/* Audio RMS volume bar/visualizer - Minimalist single border-t indicator */}
            {isRecording && (
              <div className="w-full h-1 bg-neutral-900 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{ width: `${Math.min(100, rmsVolume * 300)}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Input Controls Area */}
      {isSessionActive && (
        <footer className="space-y-4 px-4 sm:px-0">
          
          {/* Floating Suggestion Answer Chips */}
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-2.5 animate-fade-in max-h-48 overflow-y-auto p-0 bg-transparent border-none">
              <div className="text-[9px] uppercase font-mono tracking-wider text-neutral-500 mb-0.5">
                Suggested reply (Click to send):
              </div>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendTextMessage(suggestion)}
                  disabled={isLlmResponding}
                  className="w-full text-left text-xs sm:text-sm py-2 px-3.5 bg-neutral-900/50 hover:bg-neutral-800/85 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white transition-all duration-150 leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Core Chat Inputs */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSendText} className="flex-1 flex gap-2">
              <Input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={isLlmResponding}
                placeholder={isLlmResponding ? "Tutor is writing..." : "Type your reply..."}
                className="flex-1 h-10 px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-neutral-500 transition-all text-sm disabled:opacity-55"
              />
              <Button
                type="submit"
                disabled={!textInput.trim() || isLlmResponding}
                size="icon"
                className="h-10 w-10 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>

            <Button
              type="button"
              onClick={handleMicClick}
              disabled={status === 'PROCESSING' || status === 'THINKING'}
              size="icon"
              className={`h-10 w-10 rounded-full border transition-all duration-300 ${
                isRecording
                  ? 'bg-white border-white text-black animate-pulse-neutral'
                  : 'bg-neutral-900 border-neutral-800 text-white hover:border-neutral-600 hover:bg-neutral-850'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isRecording ? "Stop Recording" : "Start Voice Input"}
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>

          {/* Simple status hint bar */}
          <div className="text-center h-4">
            {status === 'LISTENING' && (
              <span className="text-[10px] text-neutral-400 font-mono tracking-wide uppercase animate-pulse">
                Listening... Click mic to complete
              </span>
            )}
            {status === 'PROCESSING' && (
              <span className="text-[10px] text-neutral-500 font-mono tracking-wide uppercase">
                Processing voice transcription...
              </span>
            )}
            {status === 'THINKING' && (
              <span className="text-[10px] text-neutral-500 font-mono tracking-wide uppercase">
                AI Tutor is response streaming...
              </span>
            )}
            {status === 'SPEAKING' && (
              <span className="text-[10px] text-neutral-400 font-mono tracking-wide uppercase">
                AI Tutor is speaking...
              </span>
            )}
          </div>
        </footer>
      )}

      {status === 'ERROR' && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-rose-500 mt-2 font-mono uppercase tracking-wide bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>Error: Connection issues. Please refresh and try again.</span>
        </div>
      )}

    </div>
  );
}
