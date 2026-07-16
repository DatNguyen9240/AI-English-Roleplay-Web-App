import React, { useState, useEffect, useRef } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { ChatMessage } from '@/features/audio-core/hooks/useAudioRecorder';
import { Mic, Send, RotateCcw, AlertCircle, Settings, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BlurText } from '@/components/react-bits/BlurText';
import { Experience } from '@/components/3d/Experience';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { config } from '@/config';

interface AudioDashboardProps {
  isRecording: boolean;
  status: RecordingStatus;
  rmsVolume: number;
  transcript: string;
  chatHistory: ChatMessage[];
  currentPlayingSentence?: string;
  startRecording: (topic?: string, targetBand?: string, ieltsPart?: string) => void;
  stopRecording: () => void;
  startMicManual: () => void;
  interruptAi: () => void;
  sendTextMessage: (text: string) => void;
  resetSession: () => void;
  suggestions: string[];
  speakText: (text: string) => void;
  currentlySpeakingText?: string | null;
  lipsyncManager: any;
  ttsVoiceName: string | null;
  changeTtsVoiceName: (val: string | null) => void;
  ttsRate: number;
  changeTtsRate: (val: number) => void;
  availableVoices: SpeechSynthesisVoice[];
  useBrowserTts: boolean;
  toggleBrowserTts: (val: boolean) => void;
  useBrowserStt: boolean;
  toggleBrowserStt: (val: boolean) => void;
  activeTab: 'practice' | 'about';
  setActiveTab: (tab: 'practice' | 'about') => void;
}

interface ChatBubbleProps {
  message: ChatMessage;
  isUser: boolean;
  currentPlayingSentence?: string;
  speakText: (text: string) => void;
  currentlySpeakingText?: string | null;
  onWordSelected: (word: string) => void;
}

function ChatBubble({
  message,
  isUser,
  currentPlayingSentence,
  speakText,
  currentlySpeakingText,
  onWordSelected,
}: ChatBubbleProps) {
  const [slide, setSlide] = useState(0); // 0 = English, 1 = Vietnamese
  const [translation, setTranslation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const fetchTranslation = async (text: string) => {
    if (translation) return;
    setIsLoading(true);
    try {
      const cleanText = text.replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '').trim();
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(cleanText)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Translation failed');
      const data = await response.json();
      const translatedText = data[0].map((x: any) => x[0]).join('');
      setTranslation(translatedText);
    } catch (e) {
      console.error(e);
      setTranslation('Dịch thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSlide = (targetSlide: number) => {
    setSlide(targetSlide);
    if (targetSlide === 1) {
      fetchTranslation(message.text);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        toggleSlide(1);
      } else {
        toggleSlide(0);
      }
    }
  };

  const getActiveSentenceIndex = () => {
    if (!currentPlayingSentence) return -1;
    const englishSentences = message.text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+/g) || [message.text];
    const cleanCurrent = currentPlayingSentence.trim().toLowerCase();

    return englishSentences.findIndex((s) => {
      const cleanSentence = s.trim().toLowerCase();
      return cleanSentence.includes(cleanCurrent) || cleanCurrent.includes(cleanSentence);
    });
  };

  const renderHighlightedText = (text: string, activeIndex: number) => {
    if (activeIndex === -1) return <span>{text}</span>;

    // Split text into sentences using standard punctuation regex
    const sentenceArray = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+/g) || [text];

    return (
      <span>
        {sentenceArray.map((sentence, idx) => {
          const isCurrent = idx === activeIndex;
          return (
            <span
              key={idx}
              className={`${isCurrent
                  ? 'bg-white/15 text-white rounded-sm'
                  : 'opacity-65'
                } transition-all duration-150`}
            >
              {sentence}
            </span>
          );
        })}
      </span>
    );
  };

  const activeIndex = !isUser ? getActiveSentenceIndex() : -1;

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection) return;
    const selectedText = selection.toString().trim();
    if (selectedText.length >= 2 && selectedText.length <= 40 && !selectedText.includes('\n')) {
      onWordSelected(selectedText);
    }
  };

  return (
    <div
      className={`flex flex-col max-w-[92%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'
        } animate-fade-in`}
    >
      <div className="text-[10px] text-neutral-500 mb-1 uppercase font-mono tracking-wider">
        {isUser ? 'You' : 'Tutor'}
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative group rounded-xl text-sm overflow-hidden transition-all duration-200 select-none w-fit max-w-full ${isUser
            ? 'bg-neutral-800 text-white border border-transparent'
            : 'bg-neutral-900/40 border border-neutral-800 text-neutral-200'
          }`}
        style={{ minWidth: '80px' }}
      >
        {/* Sliding Wrapper */}
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {/* Slide 0: English */}
          <div
            onMouseUp={handleSelection}
            onTouchEnd={handleSelection}
            className="w-full shrink-0 px-4 py-2.5 pr-14 leading-relaxed relative min-h-[46px] select-text"
          >
            {isUser ? (
              message.text
            ) : (
              renderHighlightedText(message.text, activeIndex)
            )}

            {/* Speaker Replay Button */}
            {!isUser && (
              <button
                type="button"
                onClick={() => speakText(message.text)}
                className={`absolute right-2.5 bottom-2 transition-colors duration-155 p-1 rounded-md border cursor-pointer ${currentlySpeakingText === message.text
                    ? 'text-red-500 bg-red-950/40 hover:bg-red-900 border-red-800'
                    : 'text-neutral-500 hover:text-white bg-neutral-950/40 hover:bg-neutral-900 border border-neutral-800/40'
                  }`}
                title={currentlySpeakingText === message.text ? "Stop speaking" : "Speak this message"}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Slide 1: Vietnamese Translation */}
          <div
            onMouseUp={handleSelection}
            onTouchEnd={handleSelection}
            className="w-full shrink-0 px-4 py-2.5 pr-14 leading-relaxed italic text-neutral-300 min-h-[46px] flex items-center select-text"
          >
            {isLoading ? (
              <div className="flex items-center gap-1.5 text-neutral-500 animate-pulse font-mono text-xs select-none">
                <span>Dịch...</span>
              </div>
            ) : translation ? (
              renderHighlightedText(translation, activeIndex)
            ) : (
              'Đang tải bản dịch...'
            )}
          </div>
        </div>
      </div>

      {/* Minimalistic EN-VI slide dots */}
      {!isUser && (
        <div className="flex gap-1.5 mt-1.5 px-2 select-none">
          <span
            onClick={() => toggleSlide(0)}
            className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-150 ${slide === 0 ? 'bg-neutral-400 w-3.5' : 'bg-neutral-800 hover:bg-neutral-650'
              }`}
            title="English"
          />
          <span
            onClick={() => toggleSlide(1)}
            className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-150 ${slide === 1 ? 'bg-neutral-400 w-3.5' : 'bg-neutral-800 hover:bg-neutral-650'
              }`}
            title="Vietnamese Translation"
          />
        </div>
      )}
    </div>
  );
}

interface SuggestionBubbleProps {
  suggestion: string;
  isLlmResponding: boolean;
  sendTextMessage: (text: string) => void;
  speakText: (text: string) => void;
  currentlySpeakingText?: string | null;
}

function SuggestionBubble({
  suggestion,
  isLlmResponding,
  sendTextMessage,
  speakText,
  currentlySpeakingText,
}: SuggestionBubbleProps) {
  const [slide, setSlide] = useState(0); // 0 = English, 1 = Vietnamese
  const [translation, setTranslation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const fetchTranslation = async (text: string) => {
    if (translation) return;
    setIsLoading(true);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Translation failed');
      const data = await response.json();
      const translatedText = data[0].map((x: any) => x[0]).join('');
      setTranslation(translatedText);
    } catch (e) {
      console.error(e);
      setTranslation('Dịch thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSlide = (targetSlide: number) => {
    setSlide(targetSlide);
    if (targetSlide === 1) {
      fetchTranslation(suggestion);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        toggleSlide(1);
      } else {
        toggleSlide(0);
      }
    }
  };

  return (
    <div className="flex flex-col w-full items-center gap-1">
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full group rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900/30 transition-all duration-200 select-none"
      >
        {/* Sliding Wrapper */}
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {/* Slide 0: English Suggestion (Clickable to send) */}
          <div className="w-full shrink-0 relative min-h-[46px]">
            <button
              type="button"
              onClick={() => sendTextMessage(suggestion)}
              disabled={isLlmResponding}
              className="w-full text-left text-xs sm:text-sm py-2.5 pl-3.5 pr-14 bg-transparent hover:bg-neutral-800/40 text-neutral-300 hover:text-white transition-all duration-150 leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal cursor-pointer"
            >
              {suggestion}
            </button>

            {/* Speaker Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speakText(suggestion);
              }}
              className={`absolute right-2.5 bottom-2 transition-colors duration-155 p-1 rounded-md border cursor-pointer ${currentlySpeakingText === suggestion
                  ? 'text-red-500 bg-red-950/40 hover:bg-red-900 border-red-800'
                  : 'text-neutral-500 hover:text-white bg-neutral-950/40 hover:bg-neutral-900 border border-neutral-800/40'
                }`}
              title={currentlySpeakingText === suggestion ? "Stop speaking" : "Speak this suggestion"}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Slide 1: Vietnamese Translation (Also clickable to send) */}
          <div className="w-full shrink-0 relative min-h-[46px] flex items-center bg-neutral-950/40">
            <button
              type="button"
              onClick={() => sendTextMessage(suggestion)}
              disabled={isLlmResponding}
              className="w-full text-left text-xs sm:text-sm py-2.5 pl-3.5 pr-14 bg-transparent hover:bg-neutral-800/40 text-neutral-400 hover:text-white transition-all duration-150 leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal cursor-pointer italic"
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-neutral-500 animate-pulse font-mono text-xs select-none">
                  Dịch...
                </span>
              ) : (
                translation || 'Đang tải bản dịch...'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Dots indicator for Suggestion Card */}
      <div className="flex gap-1.5 select-none py-0.5">
        <span
          onClick={() => toggleSlide(0)}
          className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-150 ${slide === 0 ? 'bg-neutral-400 w-3.5' : 'bg-neutral-800 hover:bg-neutral-650'
            }`}
          title="English Suggestion"
        />
        <span
          onClick={() => toggleSlide(1)}
          className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-150 ${slide === 1 ? 'bg-neutral-400 w-3.5' : 'bg-neutral-800 hover:bg-neutral-650'
            }`}
          title="Vietnamese Translation"
        />
      </div>
    </div>
  );
}

export function AudioDashboard({
  isRecording,
  status,
  rmsVolume,
  transcript,
  chatHistory,
  currentPlayingSentence,
  startRecording,
  stopRecording,
  startMicManual,
  interruptAi,
  sendTextMessage,
  resetSession,
  suggestions,
  speakText,
  currentlySpeakingText = null,
  lipsyncManager,
  ttsVoiceName,
  changeTtsVoiceName,
  ttsRate,
  changeTtsRate,
  availableVoices,
  useBrowserTts,
  toggleBrowserTts,
  useBrowserStt,
  toggleBrowserStt,
  activeTab,
  setActiveTab,
}: AudioDashboardProps): React.ReactElement {
  const [topicInput, setTopicInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Dictionary lookup state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordInfo, setWordInfo] = useState<any | null>(null);
  const [isWordInfoLoading, setIsWordInfoLoading] = useState(false);
  const [popupSlide, setPopupSlide] = useState(0);

  const popupTouchStartX = useRef(0);
  const popupTouchEndX = useRef(0);

  const handlePopupTouchStart = (e: React.TouchEvent) => {
    popupTouchStartX.current = e.targetTouches[0].clientX;
    popupTouchEndX.current = e.targetTouches[0].clientX;
  };

  const handlePopupTouchMove = (e: React.TouchEvent) => {
    popupTouchEndX.current = e.targetTouches[0].clientX;
  };

  const handlePopupTouchEnd = () => {
    const diff = popupTouchStartX.current - popupTouchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setPopupSlide(1);
      } else {
        setPopupSlide(0);
      }
    }
  };

  const fetchWordInfo = async (word: string) => {
    setIsWordInfoLoading(true);
    setWordInfo(null);
    try {
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
      const response = await fetch(`${config.apiUrl}/api/word-info?word=${encodeURIComponent(cleanWord)}`);
      if (!response.ok) throw new Error('Failed to fetch word details');
      const data = await response.json();
      setWordInfo(data);
    } catch (e) {
      console.error(e);
      setWordInfo({
        word,
        phonetic: '',
        translation: 'Lỗi tải nghĩa.',
        definition: 'Không thể tải chi tiết từ vựng lúc này. Vui lòng thử lại.',
        examples: []
      });
    } finally {
      setIsWordInfoLoading(false);
    }
  };

  const handleWordSelected = (word: string) => {
    setSelectedWord(word);
    setPopupSlide(0);
    fetchWordInfo(word);
  };
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [targetBand, setTargetBand] = useState('7.0');
  const [ieltsPart, setIeltsPart] = useState('general');
  const [activeIeltsPart, setActiveIeltsPart] = useState<string>('general');
  const [part2Phase, setPart2Phase] = useState<'idle' | 'delivery' | 'prep' | 'speaking' | 'done'>('idle');
  const [prepTimeLeft, setPrepTimeLeft] = useState(60);
  const [speakingTimeLeft, setSpeakingTimeLeft] = useState(120);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const isSessionActive = chatHistory.length > 0 || (status !== 'IDLE' && status !== 'ERROR');
  const isLlmResponding = status === 'THINKING' || status === 'PROCESSING';

  // Auto-scroll to the bottom of the chat, or scroll to top for cue card preparation
  useEffect(() => {
    if (activeIeltsPart === 'part2' && (part2Phase === 'prep' || part2Phase === 'delivery')) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = 0;
      }
      return;
    }
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, transcript, status, activeIeltsPart, part2Phase]);

  const handleStartPractice = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveIeltsPart(ieltsPart);
    if (ieltsPart === 'part2') {
      setPart2Phase('delivery');
      setPrepTimeLeft(60);
      setSpeakingTimeLeft(120);
    } else {
      setPart2Phase('idle');
    }

    let finalTopic = topicInput.trim();
    if (!finalTopic) {
      finalTopic = ieltsPart === 'general' ? "Tutor's Choice" : "Examiner's Choice";
    }

    startRecording(finalTopic, targetBand, ieltsPart);
  };

  const handleResetSession = () => {
    setActiveIeltsPart('general');
    setIeltsPart('general');
    setPart2Phase('idle');
    setPrepTimeLeft(60);
    setSpeakingTimeLeft(120);
    resetSession();
  };

  // Timer logic for IELTS Part 2 (Cue Card)
  useEffect(() => {
    if (activeIeltsPart === 'part2' && part2Phase === 'delivery') {
      const hasAiMessage = chatHistory.some(m => m.sender === 'ai');
      if (hasAiMessage && (status === 'IDLE' || status === 'LISTENING')) {
        setPart2Phase('prep');
        setPrepTimeLeft(60);
      }
    }
  }, [status, chatHistory, activeIeltsPart, part2Phase]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (activeIeltsPart === 'part2' && part2Phase === 'prep') {
      timer = setInterval(() => {
        setPrepTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer!);
            setPart2Phase('speaking');
            setSpeakingTimeLeft(120);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeIeltsPart, part2Phase]);

  useEffect(() => {
    if (activeIeltsPart === 'part2' && part2Phase === 'speaking') {
      startMicManual();
    }
  }, [activeIeltsPart, part2Phase, startMicManual]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (activeIeltsPart === 'part2' && part2Phase === 'speaking') {
      timer = setInterval(() => {
        setSpeakingTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer!);
            stopRecording();
            setPart2Phase('done');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeIeltsPart, part2Phase, stopRecording]);

  useEffect(() => {
    if (activeIeltsPart === 'part2' && part2Phase === 'speaking' && !isRecording && (status === 'PROCESSING' || status === 'THINKING')) {
      setPart2Phase('done');
    }
  }, [isRecording, status, activeIeltsPart, part2Phase]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isLlmResponding) return;
    sendTextMessage(textInput.trim());
    setTextInput('');
  };

  const handleMicClick = () => {
    if (status === 'SPEAKING') {
      interruptAi();
    } else if (isRecording) {
      stopRecording();
    } else {
      startMicManual();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[100dvh] justify-between px-0 sm:px-6 md:px-8 py-0 sm:py-4 font-sans text-neutral-200 overflow-hidden">

      {/* 1. Header Area */}
      <header className="relative flex justify-between items-center h-16 border-b border-neutral-800 px-4 sm:px-0 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="font-bold tracking-tight text-white text-base sm:text-lg whitespace-nowrap hidden sm:inline-block">AI Tutor</span>
          {isSessionActive && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono whitespace-nowrap">
                {activeIeltsPart === 'general' ? (
                  <>
                    <span className="hidden sm:inline">General Chat</span>
                    <span className="sm:hidden">General</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">IELTS Part {activeIeltsPart.replace('part', '')}</span>
                    <span className="sm:hidden">IELTS P{activeIeltsPart.replace('part', '')}</span>
                  </>
                )}
              </span>
              {activeIeltsPart !== 'general' && (
                <span className="text-[10px] bg-neutral-900/50 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono whitespace-nowrap">
                  <span className="hidden sm:inline">Target </span>Band {targetBand}
                </span>
              )}
            </div>
          )}
        </div>



        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            variant="ghost"
            size="icon"
            title="Speech Settings"
            className={`h-8 w-8 text-neutral-400 hover:text-white transition-colors duration-255 ${showSettings ? 'bg-neutral-900 text-white' : ''
              }`}
          >
            <Settings className="w-4 h-4" />
          </Button>
          {isSessionActive && (
            <Button
              type="button"
              onClick={handleResetSession}
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

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowSettings(false)}
        >
          {/* Modal Content */}
          <div
            className="bg-neutral-950 border border-neutral-900 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="absolute right-4 top-4 text-neutral-500 hover:text-white transition-colors duration-150 p-1.5 rounded-md hover:bg-neutral-900 cursor-pointer"
              title="Close settings"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-neutral-900 pb-2">
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

            <div className="border-t border-neutral-900 pt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Practice Workspace */}
      <div className="flex-1 flex flex-col min-h-0 py-0 sm:py-6">
        {!isSessionActive ? (
          /* Start Screen (Minimalist Topic Selector) */
          <div className="flex-1 flex flex-col justify-center items-center max-w-xl mx-auto w-full text-center animate-fade-in px-4 sm:px-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white mb-2 whitespace-nowrap">
              <BlurText text="Practice Speaking English" delay={45} animateBy="words" />
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mb-8">
              Select your practice mode and target band score, then enter an optional topic or leave it blank to start.
            </p>

            <form onSubmit={handleStartPractice} className="w-full space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider font-bold">IELTS Mode</label>
                  <select
                    value={ieltsPart}
                    onChange={(e) => setIeltsPart(e.target.value)}
                    className="w-full h-11 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs sm:text-sm focus:outline-none focus:border-neutral-500 cursor-pointer"
                  >
                    <option value="general">General Practice (No Exam)</option>
                    <option value="part1">IELTS Speaking Part 1</option>
                    <option value="part2">IELTS Speaking Part 2 (Cue Card)</option>
                    <option value="part3">IELTS Speaking Part 3 (Discussion)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider font-bold">Target Band Score</label>
                  <select
                    value={targetBand}
                    onChange={(e) => setTargetBand(e.target.value)}
                    className="w-full h-11 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs sm:text-sm focus:outline-none focus:border-neutral-500 cursor-pointer"
                  >
                    <option value="5.0">Band 5.0 (Moderate)</option>
                    <option value="5.5">Band 5.5</option>
                    <option value="6.0">Band 6.0 (Competent)</option>
                    <option value="6.5">Band 6.5</option>
                    <option value="7.0">Band 7.0 (Good)</option>
                    <option value="7.5">Band 7.5</option>
                    <option value="8.0">Band 8.0+ (Expert)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider font-bold">Practice Topic / Scenario (Optional)</label>
                <Input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder={ieltsPart === 'general' ? "e.g. Job interview at a tech company" : "Leave blank for examiner's choice, or enter custom topic"}
                  className="w-full h-11 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus-visible:border-neutral-500 focus-visible:ring-1 focus-visible:ring-neutral-500 transition-all text-xs sm:text-sm"
                />
              </div>

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
          <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-neutral-950 sm:border sm:border-neutral-900 sm:rounded-xl border-0 rounded-none overflow-hidden shadow-inner">

            {/* 3D Canvas Column */}
            <div className="w-full md:w-1/2 h-[280px] md:h-full relative border-b md:border-b-0 md:border-r border-neutral-900 bg-[#121315]/40 shrink-0">
              <Suspense fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-[#121315] text-neutral-500 font-mono text-[10px] uppercase tracking-wider">
                  Loading 3D Tutor...
                </div>
              }>
                <Canvas camera={{ position: [3, 3, 3], fov: 30 }} className="w-full h-full">
                  <color attach="background" args={["#121315"]} />
                  <Experience status={status} useBrowserTts={useBrowserTts} lipsyncManager={lipsyncManager} />
                </Canvas>
              </Suspense>
            </div>

            {/* Chat Log & Timer Column */}
            <div className="flex-1 flex flex-col min-h-0 relative">
              {/* IELTS Part 2 (Cue Card) countdown timer visualizer */}
              {activeIeltsPart === 'part2' && part2Phase !== 'idle' && part2Phase !== 'done' && (
                <div className="bg-neutral-900 border-b border-neutral-800 p-4 flex flex-col gap-3 text-left animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${part2Phase === 'prep' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 animate-pulse-neutral'}`} />
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          {part2Phase === 'delivery' && 'Step 1: Examiner Delivering Cue Card'}
                          {part2Phase === 'prep' && 'Step 2: Preparation Time (1 Minute)'}
                          {part2Phase === 'speaking' && 'Step 3: Speaking Time (1-2 Minutes)'}
                        </h3>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {part2Phase === 'delivery' && 'Please listen to the prompt and instructions...'}
                          {part2Phase === 'prep' && 'Take notes. The microphone will open automatically.'}
                          {part2Phase === 'speaking' && 'Speak continuously. Click the microphone button when done.'}
                        </p>
                      </div>
                    </div>

                    {(part2Phase === 'prep' || part2Phase === 'speaking') && (
                      <div className="bg-neutral-950 px-3.5 py-2 border border-neutral-800 rounded-lg text-right min-w-[80px]">
                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Time Left</div>
                        <div className={`text-lg font-bold font-mono ${part2Phase === 'prep' ? 'text-amber-500' : 'text-rose-500'}`}>
                          {part2Phase === 'prep' ? prepTimeLeft : speakingTimeLeft}s
                        </div>
                      </div>
                    )}
                  </div>

                  {part2Phase === 'prep' && suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-3.5 border-t border-neutral-800/80">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-neutral-500 w-full mb-1">Useful Vocabulary / Ideas:</span>
                      {suggestions.map((vocab, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-neutral-950/60 border border-neutral-800/60 rounded-md text-[11px] text-amber-400 font-mono">
                          {vocab}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Scrollable messages log */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    <ChatBubble
                      key={message.id}
                      message={message}
                      isUser={isUser}
                      currentPlayingSentence={currentPlayingSentence}
                      speakText={speakText}
                      currentlySpeakingText={currentlySpeakingText}
                      onWordSelected={handleWordSelected}
                    />
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
          </div>
        )}
      </div>

      {/* 3. Bottom Input Controls Area */}
      {isSessionActive && (
        <footer className="space-y-4 pt-4 px-4 sm:px-0 pb-4 sm:pb-0 shrink-0">

          {/* Floating Suggestion Answer Chips */}
          {suggestions.length > 0 && part2Phase !== 'prep' && (
            <div className="flex flex-col gap-2 animate-fade-in">
              <div className="flex justify-between items-center text-[9px] uppercase font-mono tracking-wider text-neutral-500 mb-1">
                <span>Suggested reply (Click to send):</span>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="hover:text-white transition-colors duration-150 underline decoration-dotted cursor-pointer lowercase"
                >
                  {showSuggestions ? '[hide]' : '[show]'}
                </button>
              </div>

              {showSuggestions && (
                <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto p-0 bg-transparent border-none">
                  {suggestions.map((suggestion, idx) => (
                    <SuggestionBubble
                      key={idx}
                      suggestion={suggestion}
                      isLlmResponding={isLlmResponding}
                      sendTextMessage={sendTextMessage}
                      speakText={speakText}
                      currentlySpeakingText={currentlySpeakingText}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Core Chat Inputs */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSendText} className="flex-1 flex gap-2">
              <Input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={isLlmResponding || part2Phase === 'prep'}
                placeholder={
                  part2Phase === 'prep'
                    ? "Preparing..."
                    : isLlmResponding
                      ? "Tutor is writing..."
                      : isRecording
                        ? "Listening... Speak now, or click mic to finish!"
                        : "Type your reply..."
                }
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

            <div className="relative flex items-center justify-center shrink-0">
              {isRecording && (
                <>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/30 animate-ping opacity-75 pointer-events-none" />
                  <span
                    className="absolute inline-flex rounded-full bg-emerald-500/20 pointer-events-none transition-all duration-100"
                    style={{
                      width: '60px',
                      height: '60px',
                      transform: `scale(${1 + Math.min(0.6, rmsVolume * 5)})`,
                    }}
                  />
                </>
              )}
              <Button
                type="button"
                onClick={handleMicClick}
                disabled={status === 'PROCESSING' || status === 'THINKING' || part2Phase === 'prep'}
                size="icon"
                className={`h-10 w-10 rounded-full border transition-all duration-300 relative z-10 ${status === 'SPEAKING'
                    ? 'bg-red-600 border-red-600 text-white hover:bg-red-500 hover:border-red-500 cursor-pointer animate-pulse'
                    : isRecording
                      ? 'bg-emerald-500 border-emerald-500 text-white cursor-pointer hover:bg-emerald-600 hover:border-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : 'bg-neutral-900 border-neutral-800 text-white hover:border-neutral-600 hover:bg-neutral-850 cursor-pointer'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={
                  part2Phase === 'prep'
                    ? "Mic locked during prep"
                    : status === 'SPEAKING'
                      ? "Interrupt AI Tutor"
                      : isRecording
                        ? "Stop Recording"
                        : "Start Voice Input"
                }
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Simple status hint bar */}
          <div className="text-center h-4">
            {status === 'LISTENING' && (
              <span className="text-[10px] text-emerald-400 font-semibold font-mono tracking-wide uppercase animate-pulse flex items-center justify-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Listening... Speak now or click mic to send
              </span>
            )}
            {status === 'PROCESSING' && (
              <span className="text-[10px] text-neutral-500 font-mono tracking-wide uppercase flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" />
                Processing voice transcription...
              </span>
            )}
            {status === 'THINKING' && (
              <span className="text-[10px] text-neutral-500 font-mono tracking-wide uppercase flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" />
                AI Tutor is response streaming...
              </span>
            )}
            {status === 'SPEAKING' && (
              <span className="text-[10px] text-amber-500 font-mono tracking-wide uppercase flex items-center justify-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                AI Tutor is speaking... Click mic to interrupt
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

      {/* Word Lookup Modal */}
      {selectedWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 backdrop-blur-lg rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col min-h-[280px]"
            onTouchStart={handlePopupTouchStart}
            onTouchMove={handlePopupTouchMove}
            onTouchEnd={handlePopupTouchEnd}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setSelectedWord(null);
                setWordInfo(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="absolute right-4 top-4 text-neutral-400 hover:text-white transition-colors duration-150 p-1.5 hover:bg-neutral-800 rounded-lg cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Loading State */}
            {isWordInfoLoading && (
              <div className="flex-1 flex flex-col items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-neutral-600 border-t-white rounded-full animate-spin mb-3"></div>
                <span className="text-xs text-neutral-400 font-mono">Đang phân tích từ vựng...</span>
              </div>
            )}

            {/* Word Info Loaded */}
            {!isWordInfoLoading && wordInfo && (
              <div className="flex-1 flex flex-col justify-between">

                {/* Slide 0: General Info */}
                {popupSlide === 0 && (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-white tracking-tight">{wordInfo.word}</h3>
                        {wordInfo.phonetic && (
                          <span className="text-xs font-mono text-neutral-400 px-2 py-0.5 bg-neutral-850 rounded border border-neutral-800">
                            {wordInfo.phonetic}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            const synth = window.speechSynthesis;
                            if (synth) {
                              synth.cancel();
                              const utter = new SpeechSynthesisUtterance(wordInfo.word);
                              utter.lang = 'en-US';
                              utter.rate = 0.85;
                              synth.speak(utter);
                            }
                          }}
                          className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-150 cursor-pointer"
                          title="Speak word"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-sm font-semibold text-emerald-400 mb-2 uppercase tracking-wide text-xs">
                        {wordInfo.translation}
                      </div>

                      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans mt-2 mb-4 bg-neutral-950/20 p-3 rounded-xl border border-neutral-800/45">
                        {wordInfo.definition}
                      </p>
                    </div>

                    <div className="text-[10px] text-neutral-500 font-mono text-center flex items-center justify-center gap-1.5 select-none mt-2">
                      <span>Vuốt sang trái hoặc bấm</span>
                      <button
                        onClick={() => setPopupSlide(1)}
                        className="underline text-neutral-300 hover:text-white cursor-pointer font-bold"
                      >
                        Xem ví dụ & cách dùng
                      </button>
                      <span>→</span>
                    </div>
                  </div>
                )}

                {/* Slide 1: Usage Examples */}
                {popupSlide === 1 && (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider font-mono text-neutral-400 mb-3 font-bold">
                        Cách dùng & Ví dụ thực tế
                      </h4>

                      <div className="space-y-3.5 overflow-y-auto max-h-[160px] pr-1.5">
                        {wordInfo.examples && wordInfo.examples.map((ex: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-emerald-500/50 pl-3 py-0.5">
                            <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">
                              {ex.en}
                            </p>
                            <p className="text-xs text-neutral-400 italic mt-0.5 font-sans leading-relaxed">
                              {ex.vi}
                            </p>
                          </div>
                        ))}
                        {(!wordInfo.examples || wordInfo.examples.length === 0) && (
                          <p className="text-xs text-neutral-500 italic">Không tìm thấy ví dụ mẫu nào.</p>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-neutral-500 font-mono text-center flex items-center justify-center gap-1.5 select-none mt-4">
                      <span>← Vuốt sang phải hoặc bấm</span>
                      <button
                        onClick={() => setPopupSlide(0)}
                        className="underline text-neutral-300 hover:text-white cursor-pointer font-bold"
                      >
                        Quay lại
                      </button>
                    </div>
                  </div>
                )}

                {/* Slide indicator dots */}
                <div className="flex justify-center gap-1.5 mt-4">
                  <span
                    onClick={() => setPopupSlide(0)}
                    className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-150 ${popupSlide === 0 ? 'bg-white w-3' : 'bg-neutral-600 hover:bg-neutral-400'
                      }`}
                  />
                  <span
                    onClick={() => setPopupSlide(1)}
                    className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-150 ${popupSlide === 1 ? 'bg-white w-3' : 'bg-neutral-600 hover:bg-neutral-400'
                      }`}
                  />
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
