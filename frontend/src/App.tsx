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
    speakText,
  } = useAudioRecorder(config.apiUrl);

  const isSessionActive = chatHistory.length > 0 || (status !== 'IDLE' && status !== 'ERROR');

  return (
    <PageShell isSessionActive={isSessionActive}>
      <AudioDashboard
        isRecording={isRecording}
        status={status}
        rmsVolume={rmsVolume}
        transcript={transcript}
        chatHistory={chatHistory}
        currentPlayingSentence={currentPlayingSentence}
        highlightedWordIndex={highlightedWordIndex}
        startRecording={startRecording}
        stopRecording={stopRecording}
        startMicManual={startMicManual}
        sendTextMessage={sendTextMessage}
        resetSession={resetSession}
        suggestions={suggestions}
        speakText={speakText}
        ttsVoiceName={ttsVoiceName}
        changeTtsVoiceName={changeTtsVoiceName}
        ttsRate={ttsRate}
        changeTtsRate={changeTtsRate}
        availableVoices={availableVoices}
        useBrowserTts={useBrowserTts}
        toggleBrowserTts={toggleBrowserTts}
        useBrowserStt={useBrowserStt}
        toggleBrowserStt={toggleBrowserStt}
      />
    </PageShell>
  );
}

export default App;
