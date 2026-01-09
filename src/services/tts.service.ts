
import { Injectable, signal } from '@angular/core';
import { ChatConfig } from './llm.service';

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Neutral';
  style: 'Neural' | 'Standard';
  tags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  // Config
  selectedVoiceId = signal<string>('az-AZ-BabekNeural');
  speed = signal(1.0); // 0.25 to 4.0
  // Default to reading thinking (true), so user can opt-in to Mute it.
  readThinking = signal(true); 
  
  // State
  isPlaying = signal(false);
  audioLatency = signal(0);
  detectedLanguage = signal<'az' | 'en' | 'ru' | 'tr' | 'other'>('en');
  
  // Updated Neural Voices (Edge TTS / Microsoft Neural)
  readonly voices: VoiceProfile[] = [
    { id: 'az-AZ-BabekNeural', name: 'Babək (AZ)', gender: 'Male', style: 'Neural', tags: ['az-AZ', 'Zəhər'] },
    { id: 'az-AZ-BanuNeural', name: 'Banu (AZ)', gender: 'Female', style: 'Neural', tags: ['az-AZ', 'Zərif'] },
    { id: 'tr-TR-AhmetNeural', name: 'Ahmet (TR)', gender: 'Male', style: 'Neural', tags: ['tr-TR', 'Qardaş'] },
    { id: 'tr-TR-EmelNeural', name: 'Emel (TR)', gender: 'Female', style: 'Neural', tags: ['tr-TR', 'Qardaş'] },
    { id: 'ru-RU-DmitryNeural', name: 'Dmitry (RU)', gender: 'Male', style: 'Neural', tags: ['ru-RU'] },
    { id: 'ru-RU-SvetlanaNeural', name: 'Svetlana (RU)', gender: 'Female', style: 'Neural', tags: ['ru-RU'] },
    { id: 'en-US-GuyNeural', name: 'Guy (US)', gender: 'Male', style: 'Neural', tags: ['en-US'] },
    { id: 'en-US-AriaNeural', name: 'Aria (US)', gender: 'Female', style: 'Neural', tags: ['en-US'] }
  ];

  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async speak(text: string, config: ChatConfig) {
    if (!text.trim()) return;
    
    // Stop previous audio
    this.stop();
    this.isPlaying.set(true);

    // 1. Detect Language
    const lang = this.detectLanguage(text);
    this.detectedLanguage.set(lang);

    // 2. Smart Voice Selection
    // Determine which voice ID to use. 
    // If the currently selected voice matches the detected language, use it.
    // If not, automatically switch to a voice that supports the detected language.
    let voiceToUse = this.selectedVoiceId();
    const currentVoiceProfile = this.voices.find(v => v.id === voiceToUse);
    
    let targetTag = 'en-US'; // Default fallback
    if (lang === 'az') targetTag = 'az-AZ';
    else if (lang === 'ru') targetTag = 'ru-RU';
    else if (lang === 'tr') targetTag = 'tr-TR';
    
    // If current voice doesn't match the target language tag, find a better one
    if (currentVoiceProfile && !currentVoiceProfile.tags.includes(targetTag)) {
        const compatibleVoice = this.voices.find(v => v.tags.includes(targetTag));
        if (compatibleVoice) {
            voiceToUse = compatibleVoice.id;
            console.log(`Audio Matrix: Auto-switched voice to ${compatibleVoice.name} for language ${lang}`);
        }
    }

    const startTime = Date.now();
    const cleanText = this.preprocess(text);

    if (!cleanText.trim()) {
        this.isPlaying.set(false);
        return;
    }

    try {
      // Construct Audio Endpoint
      const baseUrl = config.baseUrl.replace(/\/chat\/completions\/?$/, '').replace(/\/$/, ''); 
      const audioUrl = `${baseUrl}/audio/speech`;

      const response = await fetch(audioUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: cleanText,
          voice: voiceToUse, // Use the smart-selected voice
          speed: this.speed(),
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
            console.warn('Audio Matrix: 403 Forbidden. Your API key does not support Neural Audio/TTS.');
            this.isPlaying.set(false);
            return; 
        }
        throw new Error(`TTS API Error: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      this.audioLatency.set(Date.now() - startTime);

      if (this.audioCtx) {
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        this.playBuffer(audioBuffer);
      }

    } catch (error) {
      console.error('Audio Matrix Error:', error);
      this.isPlaying.set(false);
    }
  }

  private playBuffer(buffer: AudioBuffer) {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);
    
    source.onended = () => {
      this.isPlaying.set(false);
      this.currentSource = null;
    };

    this.currentSource = source;
    source.start(0);
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {}
      this.currentSource = null;
    }
    this.isPlaying.set(false);
  }

  private detectLanguage(text: string): 'az' | 'en' | 'ru' | 'tr' | 'other' {
    const t = text.toLowerCase();
    
    // 1. Check for Cyrillic (Russian)
    if (/[а-яё]/.test(t)) return 'ru';

    // 2. Check for Azerbaijani specific characters
    // 'ə' is the strongest indicator. 
    // 'ğ', 'ı', 'ş' are also strong but shared with Turkish (except 'ə' and 'x' usage patterns)
    if (t.includes('ə')) return 'az';

    // 3. Heuristic check for AZ vs TR vs EN
    // Check common Azerbaijani words
    const azCommonWords = /\b(salam|mən|sən|biz|siz|onlar|var|yox|nə|niyə|haqqında|üçün|ilə|və|amma|ancaq|lakin|çünki|əgər|bəlkə|yəni|məsələn|kodu|yaz|yarad|izah|et|bax|düzəlt|olaraq|kimi)\b/i;
    if (azCommonWords.test(t)) return 'az';

    // Check Turkish specific characters or words if AZ check failed but special chars exist
    if (/[ğşçüö]/.test(t)) {
        // If it has these chars but passed the 'ə' check, it might be TR or AZ without 'ə'
        // Default to AZ as per priority request, unless clearly Turkish words exist
        const trCommonWords = /\b(merhaba|ben|sen|biz|siz|onlar|evet|hayır|neden|niçin|hakkında|için|ile|ve|ama|fakat|çünkü|eğer|belki|yani|örneğin)\b/i;
        if (trCommonWords.test(t)) return 'tr';
        return 'az'; // Default to AZ for safety
    }

    // 4. Default to English
    return 'en';
  }

  private preprocess(text: string): string {
    let t = text || '';
    
    // Industrial grade regex to strip <think>...</think>
    if (!this.readThinking()) {
      t = t.replace(/<think>[\s\S]*?<\/think>/gi, '');
      t = t.replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi, '');
    }

    // Language Specific Optimization
    if (this.detectedLanguage() === 'az') {
       // Replace ellipses with a single stop for clearer sentence termination in AZ
       t = t.replace(/\.\.\./g, '.'); 
    }
    
    // Clean markdown for smoother reading
    return t
      .replace(/```[\s\S]*?```/g, ' Code block. ')
      .replace(/[#*`_~\[\]]/g, '') // Remove formatting chars
      .replace(/\(https?:\/\/[^\)]+\)/g, '') // Remove URLs
      .replace(/\n+/g, '. '); // Turn newlines into pauses
  }
}
