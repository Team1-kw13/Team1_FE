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
      noiseSuppression: true,
      autoGainControl:true
    }
  });
  
  const audioContext = new AudioContext({ sampleRate: 24000 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  
  source.connect(processor);
  /*processor.connect(audioContext.destination);*/
  //destination에 연결하지 않아도 onaudioprocess는 동작함
  
  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    const pcmBuffer = float32ToInt16(inputData);
    
    // 콜백으로 오디오 데이터 전달
    onAudioData?.(pcmBuffer.buffer);
  };
  
  return { stream, audioContext, processor };
}

/*
function stopAudioRecognition(stream, audioContext, processor) {
  if (processor) processor.disconnect();
  if (audioContext) audioContext.close();
  if (stream) stream.getTracks().forEach(track => track.stop());
}
*/
async function stopAudioRecognition(stream,audioContext,processor) {
  try { if (processor) { processor.onaudioprocess = null; processor.disconnect(); } } catch {}
  try { if (stream) stream.getTracks().forEach(t => t.stop()); } catch {}
  try {
    if (audioContext && audioContext.state !== 'closed') {+      await audioContext.close();
    }
  } catch {}
}

export default function MicButton({ onListeningStart, onListeningStop, currentStep }) {
  const [isRecording, setIsRecording] = useState(false);
  const audioSystemRef = useRef(null);
  const recognitionRef = useRef(null);
  const stoppingRef=useRef(false);
  const recogActiveRef=useRef(false);

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
        console.log('스피치 인지 결과:', transcript);
        
        // 부모 컴포넌트에 결과 전달
        if (onListeningStop) {
          onListeningStop(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("스피치 인지 에러:", event.error);
        /*stopRecording();*/ //직접 stopRecording호출하지 않고 필요하면 UI에서 멈추기
      };

      recognitionRef.current.onstart=()=>{
        recogActiveRef.current=true;
      }

      recognitionRef.current.onend = () => {
        console.log('스피치 인지 끝남');
        /*stopRecording();*/
        recogActiveRef.current=false; //종료만 표시해서 중복 stop방지
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

  {/*시작*/}
  const startRecording = async () => {
    try {
      if(stoppingRef.current) return; //멈추는 중이면 무시
      // WebSocket 연결 확인
      if (!webSocketService.isConnected) {
        console.log('WebSocket 연결 중...');
        webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setIsRecording(true);
      
      // 부모 컴포넌트에 녹음 시작 알림
      onListeningStart?.()

      // WebSocket으로 음성 발화 시작 알림
      webSocketService.startSpeaking();

      // 오디오 녹음 시작
      const audioSystem = await startAudioRecognition((arrayBuffer) => {
        webSocketService.sendAudioPCM16(arrayBuffer);
      });
      
      audioSystemRef.current = audioSystem;

      // Speech Recognition 시작 (텍스트 변환용)
      if (recognitionRef.current) {
        try{recognitionRef.current.start();} catch {}
      }

    } catch (e) {
      console.error('녹음 시작 실패:', error);
      setIsRecording(false);
      alert('마이크 접근 권한이 필요합니다.');
    }
  };

  {/*정지*/}
  const stopRecording = async() => {
    if (stoppingRef.current) return; //이미 정지 처리중
    stoppingRef.current=true;

    console.log('녹음 스탑 시작');
    setIsRecording(false);

    // 오디오 시스템 정리
    if (audioSystemRef.current) {
      const { stream, audioContext, processor } = audioSystemRef.current;
      await stopAudioRecognition(stream, audioContext, processor);
      audioSystemRef.current = null;
    }

    // Speech Recognition 정지
    // (이미 끝났을수도)
    if (recognitionRef.current&&recogActiveRef.current) {
      try{recognitionRef.current.stop();} catch{}
    }

    // WebSocket으로 음성 발화 종료 알림
    webSocketService.stopSpeaking();
    stoppingRef.current=false;
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
      className={`flex items-center px-[37px] py-[24px] text-[28px] font-bold w-[195px] h-[91px] rounded-[100px] border-[3px] border-white bg-yellow
        ${isActive 
          ? 'shadow-[0_0_80px_0_yellow]' //drop shadow 적용 
          : ''
        }`}
      disabled={currentStep === 'processing'} // 처리 중일 때는 비활성화
    >
      <img 
        src={isActive ? stopIcon : micIcon} 
        alt="Mic Icon" 
        className={isActive?"w-[15px] h-[15px] mr-[18px]":"w-[32px] h-[32px] mr-[4.5px]"}
      />
      {currentStep === 'processing' ? '인식중' : (isActive ? '인식중' : '말하기')}
    </button>
  );
}