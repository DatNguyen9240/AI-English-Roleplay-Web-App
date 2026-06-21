import React from 'react';
import { useAudioRecorder } from '@/features/audio-core/hooks/useAudioRecorder';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AudioDashboard } from '@/features/dashboard/components/AudioDashboard';
import { PageShell } from '@/components/PageShell';
import { config } from '@/config';
import { LogOut, User, Sparkles } from 'lucide-react';

function App(): React.ReactElement {
  const { user, logout } = useAuth();
  const {
    isRecording,
    status,
    rmsVolume,
    transcript,
    llmText,
    chatHistory,
    currentPlayingSentence,
    highlightedWordIndex,
    startRecording,
    stopRecording,
    sendTextMessage,
  } = useAudioRecorder(config.apiUrl);

  if (!user) {
    return (
      <PageShell>
        <AuthForm />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Top Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-6 px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            AI Roleplay
          </span>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-full py-1.5 pl-3.5 pr-1.5 shadow-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium max-w-[120px] truncate">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate">{user.email}</span>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors focus:outline-none"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AudioDashboard
        isRecording={isRecording}
        status={status}
        rmsVolume={rmsVolume}
        transcript={transcript}
        llmText={llmText}
        chatHistory={chatHistory}
        currentPlayingSentence={currentPlayingSentence}
        highlightedWordIndex={highlightedWordIndex}
        startRecording={startRecording}
        stopRecording={stopRecording}
        sendTextMessage={sendTextMessage}
      />
    </PageShell>
  );
}

export default App;
