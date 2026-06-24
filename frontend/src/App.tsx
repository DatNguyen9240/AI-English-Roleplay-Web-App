import React from 'react';
import { useAudioRecorder } from '@/features/audio-core/hooks/useAudioRecorder';
import { AudioDashboard } from '@/features/dashboard/components/AudioDashboard';
import { PageShell } from '@/components/PageShell';
import { config } from '@/config';

function App(): React.ReactElement {
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
    suggestions,
  } = useAudioRecorder(config.apiUrl);

  const isSessionActive = chatHistory.length > 0 || (status !== 'IDLE' && status !== 'ERROR');

  return (
    <PageShell isSessionActive={isSessionActive}>
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
