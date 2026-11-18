/**
 * OpenAI Whisper Speech-to-Text Service
 * 음성을 텍스트로 변환합니다
 */

interface RecorderOptions {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onTranscription?: (text: string) => void;
  onError?: (error: Error) => void;
}

class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private stream: MediaStream | null = null;
  private options: RecorderOptions;

  constructor(options: RecorderOptions = {}) {
    this.options = options;
  }

  /**
   * 마이크 접근 권한을 요청하고 녹음을 시작합니다
   */
  async startRecording(): Promise<void> {
    try {
      console.log('[STT] Requesting microphone access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.stream = stream;
      this.audioChunks = [];

      // AudioContext 초기화
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // MediaRecorder 생성
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        console.log('[STT] Recording started');
        this.options.onRecordingStart?.();
      };

      this.mediaRecorder.onstop = async () => {
        this.isRecording = false;
        console.log('[STT] Recording stopped');
        this.options.onRecordingStop?.();

        // 녹음 완료 후 자동으로 변환 시작
        await this.transcribe();
      };

      this.mediaRecorder.start();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[STT] Failed to start recording:', err);
      this.options.onError?.(err);
      throw err;
    }
  }

  /**
   * 녹음을 중지합니다
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      console.log('[STT] Stopping recording...');
      this.mediaRecorder.stop();

      // 마이크 스트림 해제
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    }
  }

  /**
   * 녹음된 오디오를 텍스트로 변환합니다
   */
  private async transcribe(): Promise<void> {
    try {
      if (this.audioChunks.length === 0) {
        console.warn('[STT] No audio chunks to transcribe');
        return;
      }

      // 오디오 Blob 생성
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      console.log('[STT] Audio blob created, size:', audioBlob.size);

      // WebM을 MP3로 변환 (또는 직접 Whisper에 전송)
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ko');

      console.log('[STT] Sending to OpenAI Whisper API...');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Whisper API Error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const transcribedText = data.text;

      console.log('[STT] Transcription complete:', transcribedText);
      this.options.onTranscription?.(transcribedText);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[STT] Transcription failed:', err);
      this.options.onError?.(err);
    }
  }

  /**
   * 현재 녹음 상태를 반환합니다
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }
}

let recorder: AudioRecorder | null = null;

/**
 * 음성 입력을 시작합니다
 */
export function startSpeechRecognition(options: RecorderOptions): void {
  if (recorder?.getIsRecording()) {
    console.warn('[STT] Recording is already in progress');
    return;
  }

  recorder = new AudioRecorder(options);
  recorder.startRecording().catch(error => {
    console.error('[STT] Failed to initialize recording:', error);
    options.onError?.(error);
  });
}

/**
 * 음성 입력을 중지합니다
 */
export function stopSpeechRecognition(): void {
  if (recorder) {
    recorder.stopRecording();
  }
}

/**
 * 현재 녹음 상태를 확인합니다
 */
export function isRecording(): boolean {
  return recorder?.getIsRecording() ?? false;
}
