import { useState, useRef, useEffect } from "react";
import micIcon from "../../assets/images/mic_fill.svg";
import stopIcon from "../../assets/images/stop.svg";
import webSocketService from "../../service/websocketService";

// 오디오 유틸리티 함수들
function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Float32 (-1.0 ~ 1.0)를 Int16 (-32768 ~ 32767)로 변환
    int16Array[i] = Math.max(-1, Math.min(1, float32Array[i])) * 0x7FFF;
  }
  return int16Array;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB 청크로 처리
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function startAudioRecognition(onAudioData) {
  const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      sampleRate: 24000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true
    }
  });
  
  const audioContext = new AudioContext({ sampleRate: 24000 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  
  source.connect(processor);
  processor.connect(audioContext.destination);
  
  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    const pcmBuffer = float32ToInt16(inputData);
    const base64Data = arrayBufferToBase64(pcmBuffer.buffer);
    
    // 콜백으로 오디오 데이터 전달
    if (onAudioData) {
      onAudioData(base64Data);
    }
  };
  
  return { stream, audioContext, processor };
}

function stopAudioRecognition(stream, audioContext, processor) {
  if (processor) processor.disconnect();
  if (audioContext) audioContext.close();
  if (stream) stream.getTracks().forEach(track => track.stop());
}

export default function MicButton({ onListeningStart, onListeningStop, currentStep }) {
  const [isRecording, setIsRecording] = useState(false);
  const audioSystemRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Speech Recognition 초기화 (텍스트 변환용)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "ko-KR";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech Recognition 결과:', transcript);
        
        // 부모 컴포넌트에 결과 전달
        if (onListeningStop) {
          onListeningStop(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        stopRecording();
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        stopRecording();
      };
    }

    return () => {
      // 컴포넌트 언마운트 시 정리
      if (audioSystemRef.current) {
        const { stream, audioContext, processor } = audioSystemRef.current;
        stopAudioRecognition(stream, audioContext, processor);
      }
    };
  }, [onListeningStop]);

  const startRecording = async () => {
    try {
      // WebSocket 연결 확인
      if (!webSocketService.isConnected) {
        console.log('WebSocket 연결 중...');
        webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setIsRecording(true);
      
      // 부모 컴포넌트에 녹음 시작 알림
      if (onListeningStart) {
        onListeningStart();
      }

      // WebSocket으로 음성 발화 시작 알림
      webSocketService.startSpeaking();

      // 오디오 녹음 시작 (Base64 인코딩된 데이터 전송)
      const audioSystem = await startAudioRecognition((base64Data) => {
        // WebSocket으로 Base64 인코딩된 오디오 데이터 전송
        webSocketService.sendAudio(base64Data);
      });
      
      audioSystemRef.current = audioSystem;

      // Speech Recognition 시작 (텍스트 변환용)
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

    } catch (error) {
      console.error('Recording start failed:', error);
      setIsRecording(false);
      alert('마이크 접근 권한이 필요합니다.');
    }
  };

  const stopRecording = () => {
    console.log('Recording stop 시작');
    setIsRecording(false);

    // 오디오 시스템 정리
    if (audioSystemRef.current) {
      const { stream, audioContext, processor } = audioSystemRef.current;
      stopAudioRecognition(stream, audioContext, processor);
      audioSystemRef.current = null;
    }

    // Speech Recognition 정지
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // WebSocket으로 음성 발화 종료 알림
    webSocketService.stopSpeaking();
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // 현재 상태에 따른 버튼 스타일 결정
  const isActive = isRecording || currentStep === 'listening' || currentStep === 'processing';
    
  return (
    <button 
      onClick={handleMicClick} 
      className={`flex gap-[10px] items-center px-[37px] py-[24px] text-[28px] font-bold w-[195px] h-[91px] rounded-[100px] border-[3px] border-white bg-yellow
        ${isActive 
          ? 'shadow-[0_0_80px_0_yellow]' //drop shadow 적용 
          : ''
        }`}
      disabled={currentStep === 'processing'} // 처리 중일 때는 비활성화
    >
      <img 
        src={isActive ? stopIcon : micIcon} 
        alt="Mic Icon" 
        className="w-6 h-6" 
      />
      {currentStep === 'processing' ? '인식중' : (isActive ? '인식중' : '말하기')}
    </button>
  );
}