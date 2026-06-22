import React from 'react';
import { Volume2 } from 'lucide-react';

interface VoiceSettingsCardProps {
  useBrowserTts: boolean;
  availableVoices: SpeechSynthesisVoice[];
  ttsVoiceName: string | null;
  changeTtsVoiceName: (val: string | null) => void;
  ttsRate: number;
  changeTtsRate: (val: number) => void;
}

export const VoiceSettingsCard: React.FC<VoiceSettingsCardProps> = ({
  useBrowserTts,
  availableVoices,
  ttsVoiceName,
  changeTtsVoiceName,
  ttsRate,
  changeTtsRate,
}) => {
  if (!useBrowserTts) return null;

  return (
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
  );
};
