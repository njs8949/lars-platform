/**
 * ElevenLabs TTS 테스트 함수
 */

export async function testElevenLabsAPI(): Promise<void> {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  if (!apiKey) {
    console.error('❌ ElevenLabs API Key not found');
    return;
  }

  console.log('🧪 Testing ElevenLabs API...');
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  console.log('Voice ID:', voiceId);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: '안녕하세요. 엘븐랩스 음성 출력 테스트입니다.',
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    console.log('Response Status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ ElevenLabs API Error:', error);
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('✅ Audio generated successfully! Size:', audioBuffer.byteLength, 'bytes');

    // 음성 재생
    playTestAudio(audioBuffer);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * 테스트 음성을 재생합니다
 */
function playTestAudio(audioBuffer: ArrayBuffer): void {
  try {
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio();
    audio.src = audioUrl;
    audio.play().then(() => {
      console.log('✅ Audio playback started');
    }).catch(error => {
      console.error('❌ Audio playback error:', error);
    });

    audio.onended = () => {
      console.log('✅ Audio playback completed');
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = () => {
      console.error('❌ Audio error event');
    };
  } catch (error) {
    console.error('❌ Audio playback failed:', error);
  }
}

/**
 * ElevenLabs 사용 가능한 음성 목록을 확인합니다
 */
export async function listAvailableVoices(): Promise<void> {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('❌ ElevenLabs API Key not found');
    return;
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch voices');
      return;
    }

    const data = await response.json();
    console.log('📋 Available Voices:');
    data.voices.forEach((voice: any) => {
      console.log(`- ${voice.name} (ID: ${voice.voice_id})`);
    });
  } catch (error) {
    console.error('❌ Failed to list voices:', error);
  }
}
