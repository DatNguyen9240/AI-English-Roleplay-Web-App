import React, { useEffect, useRef } from 'react';
import { RecordingStatus } from 'shared-contracts';
import { Volume2 } from 'lucide-react';
import { ChatMessage } from '@/features/audio-core/hooks/useAudioRecorder';

interface ChatBubblesProps {
  chatHistory: ChatMessage[];
  status: RecordingStatus;
  currentPlayingSentence?: string;
  highlightedWordIndex?: number;
  playMessageText: (text: string) => void;
}

export const ChatBubbles: React.FC<ChatBubblesProps> = ({
  chatHistory,
  status,
  currentPlayingSentence,
  highlightedWordIndex = -1,
  playMessageText,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, status, currentPlayingSentence]);

  return (
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
              <div className={`text-[10px] text-slate-500 font-mono mb-1 px-1 flex items-center gap-1.5 ${isUser ? 'justify-end text-right' : 'justify-start text-left'}`}>
                <span>{isUser ? 'You' : 'AI Tutor'}</span>
                {!isUser && (
                  <button
                    onClick={() => playMessageText(msg.text)}
                    title="Listen Again (Nghe lại)"
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors focus:outline-none flex items-center justify-center"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                )}
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
  );
};
