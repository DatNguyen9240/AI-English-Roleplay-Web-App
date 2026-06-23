import React from 'react';
import { useAudioRecorder } from '@/features/audio-core/hooks/useAudioRecorder';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AudioDashboard } from '@/features/dashboard/components/AudioDashboard';
import { PageShell } from '@/components/PageShell';
import { Logo } from '@/components/Logo';
import { config } from '@/config';
import { LogOut, User } from 'lucide-react';

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
    useBrowserTts,
    toggleBrowserTts,
    useBrowserStt,
    toggleBrowserStt,
    startMicManual,
    resetSession,
    ttsVoiceName,
    changeTtsVoiceName,
    ttsRate,
    changeTtsRate,
    availableVoices,
  } = useAudioRecorder(config.apiUrl);

  const isSessionActive = chatHistory.length > 0 || (status !== 'IDLE' && status !== 'ERROR');

  if (!user) {
    return (
      <PageShell>
        <AuthForm />
      </PageShell>
    );
  }

  return (
    <PageShell isSessionActive={isSessionActive}>
      {/* Top Header */}
      <div className={`w-full max-w-6xl flex justify-between items-center mb-4 sm:mb-6 px-4 sm:px-2 ${isSessionActive ? 'hidden sm:flex' : 'flex'}`}>
        <Logo size="sm" />
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-full py-1.5 pl-3.5 pr-1.5 shadow-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium max-w-[120px] sm:max-w-none truncate">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate hidden sm:inline">{user.email}</span>
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
        useBrowserTts={useBrowserTts}
        toggleBrowserTts={toggleBrowserTts}
        useBrowserStt={useBrowserStt}
        toggleBrowserStt={toggleBrowserStt}
        startMicManual={startMicManual}
        resetSession={resetSession}
        ttsVoiceName={ttsVoiceName}
        changeTtsVoiceName={changeTtsVoiceName}
        ttsRate={ttsRate}
        changeTtsRate={changeTtsRate}
        availableVoices={availableVoices}
        suggestions={suggestions}
      />
    </PageShell>
  );
}

export default App;
