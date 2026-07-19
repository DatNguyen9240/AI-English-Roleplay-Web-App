import React, { lazy, Suspense, useState } from 'react';
import { useAudioRecorder } from '@/features/audio-core/hooks/useAudioRecorder';
import { AudioDashboard } from '@/features/dashboard/components/AudioDashboard';
import { PageShell } from '@/components/PageShell';
import { config } from '@/config';

const PortfolioView = lazy(() => import('@/features/portfolio/components/PortfolioView').then((module) => ({
  default: module.PortfolioView,
})));

function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'practice' | 'about'>('practice');
  const {
    isRecording,
    status,
    rmsVolume,
    transcript,
    chatHistory,
    currentPlayingSentence,
    startRecording,
    stopRecording,
    sendTextMessage,
    useBrowserTts,
    toggleBrowserTts,
    useBrowserStt,
    toggleBrowserStt,
    startMicManual,
    interruptAi,
    resetSession,
    ttsVoiceName,
    changeTtsVoiceName,
    ttsRate,
    changeTtsRate,
    availableVoices,
    isVoiceReady,
    suggestions,
    speakText,
    currentlySpeakingText,
    lipsyncManager,
  } = useAudioRecorder(config.apiUrl);

  const isSessionActive = chatHistory.length > 0 || (status !== 'IDLE' && status !== 'ERROR');
  const isPageShellLocked = isSessionActive && activeTab === 'practice';

  return (
    <PageShell isSessionActive={isPageShellLocked}>
      {activeTab === 'practice' ? (
        <AudioDashboard
          isRecording={isRecording}
          status={status}
          rmsVolume={rmsVolume}
          transcript={transcript}
          chatHistory={chatHistory}
          currentPlayingSentence={currentPlayingSentence}
          startRecording={startRecording}
          stopRecording={stopRecording}
          startMicManual={startMicManual}
          interruptAi={interruptAi}
          sendTextMessage={sendTextMessage}
          resetSession={resetSession}
          suggestions={suggestions}
          speakText={speakText}
          currentlySpeakingText={currentlySpeakingText}
          lipsyncManager={lipsyncManager}
          ttsVoiceName={ttsVoiceName}
          changeTtsVoiceName={changeTtsVoiceName}
          ttsRate={ttsRate}
          changeTtsRate={changeTtsRate}
          availableVoices={availableVoices}
          isVoiceReady={isVoiceReady}
          useBrowserTts={useBrowserTts}
          toggleBrowserTts={toggleBrowserTts}
          useBrowserStt={useBrowserStt}
          toggleBrowserStt={toggleBrowserStt}
        />
      ) : (
        <Suspense fallback={null}>
          <PortfolioView setActiveTab={setActiveTab} />
        </Suspense>
      )}
    </PageShell>
  );
}

export default App;
