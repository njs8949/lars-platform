/**
 * ElevenLabs Text-to-Speech Service
 * 텍스트를 음성으로 변환하여 재생합니다
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

export async function textToSpeech(text: string): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    console.warn('[TTS] ElevenLabs API key not configured');
    return;
  }

  try {
    console.log('[TTS] Starting text-to-speech conversion...');

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[TTS] API Error:', error);
      throw new Error(`TTS API Error: ${error.detail?.message || response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    playAudio(audioBuffer);

    console.log('[TTS] Audio playback started');
  } catch (error) {
    console.error('[TTS] Conversion failed:', error);
  }
}

/**
 * 오디오 버퍼를 재생합니다
 */
function playAudio(audioBuffer: ArrayBuffer): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    audioContext.decodeAudioData(audioBuffer, (audioBuffer) => {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);

      console.log('[TTS] Audio playback completed');
    });
  } catch (error) {
    console.error('[TTS] Audio playback error:', error);
    // Fallback: Blob URL 사용
    playAudioWithBlobUrl(audioBuffer);
  }
}

/**
 * Blob URL을 사용하여 오디오를 재생합니다 (대체 방법)
 */
function playAudioWithBlobUrl(audioBuffer: ArrayBuffer): void {
  try {
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio();
    audio.src = audioUrl;
    audio.play().catch(error => {
      console.error('[TTS] Audio play failed:', error);
    });

    // 재생 완료 후 메모리 해제
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  } catch (error) {
    console.error('[TTS] Blob URL playback error:', error);
  }
}

/**
 * 현재 재생 중인 오디오를 중지합니다
 */
export function stopAudio(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContext.suspend().then(() => {
      console.log('[TTS] Audio stopped');
    });
  } catch (error) {
    console.error('[TTS] Stop audio error:', error);
  }
}
