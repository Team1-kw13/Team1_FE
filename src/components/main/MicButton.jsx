import { useState, useRef, useEffect } from "react";
import micIcon from "../../assets/images/mic_fill.svg";
import stopIcon from "../../assets/images/stop.svg";
import webSocketService from "../../service/websocketService";

// 유틸: 오디오 캡처 & 변환
function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    int16Array[i] = Math.max(-1, Math.min(1, float32Array[i])) * 0x7FFF;
  }
  return int16Array;
}

// 오디오 캡처 시작 (PCM16 ArrayBuffer 콜백으로 전달)
async function startAudioCapture(onAudioData) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: 24000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  const AC = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AC({ sampleRate: 24000 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  source.connect(processor);
  // processor.connect(audioContext.destination); // 필요 없으면 연결 X

  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    const pcm = float32ToInt16(input);
    onAudioData?.(pcm.buffer); // ArrayBuffer로 전달
  };

  return { stream, audioContext, processor };
}

// 오디오 캡처 정지
async function stopAudioCapture(stream, audioContext, processor) {
  try {
    if (processor) {
      processor.onaudioprocess = null;
      processor.disconnect();
    }
  } catch (e) {
    console.warn('Processor disconnect error:', e);
  }

  try {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  } catch (e) {
    console.warn('Stream stop error:', e);
  }

  try {
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }
  } catch (e) {
    console.warn('Audio context close error:', e);
  }
}

export default function MicButton({ 
  onListeningStart, 
  onListeningStop, 
  onTranscriptUpdate, 
  currentStep 
}) {
  const [isRecording, setIsRecording] = useState(false);
  const audioSystemRef = useRef(null);
  //첫PCM청크가 서버에 도달하기 전에 stopSpeaking()을 안보내도록
  const hasAudioRef=useRef(false); 
  const stoppingRef = useRef(false);
  const audioDataCountRef = useRef(0);

  // 브라우저 스피치 인식 추가
  const recognitionRef = useRef(null);
  const recogActiveRef = useRef(false);

  useEffect(() => {
    // 브라우저 스피치 인식 초기화
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;   // 중간 결과 필요시 true
      rec.lang = "ko-KR";

      rec.onresult = (event) => {
        const transcript = event.results[0][0]?.transcript || "";
        console.log("🎤 브라우저 스피치 인식 결과:", transcript);
        onTranscriptUpdate?.(transcript);
        onListeningStop?.(transcript);
      };

      rec.onerror = (event) => {
        console.error("스피치 인식 에러:", event.error);
      };

      rec.onstart = () => { 
        recogActiveRef.current = true; 
        console.log("브라우저 스피치 인식 시작");
      };
      
      rec.onend = () => { 
        recogActiveRef.current = false; 
        console.log("브라우저 스피치 인식 종료");
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (audioSystemRef.current) {
        const { stream, audioContext, processor } = audioSystemRef.current;
        stopAudioCapture(stream, audioContext, processor);
      }
    };
  }, [onListeningStop, onTranscriptUpdate]);

  const startRecording = async () => {
    try {
      if (stoppingRef.current) return;

      console.log("🎤 음성 녹음 시작");

      // WebSocket 연결 확인
      if (!webSocketService.isConnected) {
        await webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
      }

      setIsRecording(true);
      onListeningStart?.();
      hasAudioRef.current = false;
      audioDataCountRef.current = 0;

      // 1단계: 서버에 음성 발화 시작 알림 (commit)
      //const commitSent = webSocketService.startSpeaking();
      //console.log("📤 input_audio_buffer.commit 전송:", commitSent);
      webSocketService.startSpeaking();

      // 2단계: 오디오 캡처 시작 및 실시간 전송
      const audioSystem = await startAudioCapture((arrayBuffer) => {
        const sent = webSocketService.sendAudioPCM16(arrayBuffer);
        if (sent) {
          hasAudioRef.current = true;
          audioDataCountRef.current++;
        }
      });
      audioSystemRef.current = audioSystem;

      // 3단계: 브라우저 스피치 인식 시작 (백업)
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
      } catch (e) {
        console.warn("브라우저 스피치 인식 시작 실패:", e);
      }

    } catch (e) {
      console.error("녹음 시작 실패:", e);
      setIsRecording(false);
      alert("마이크 접근 권한이 필요합니다.");
    }
  };

  const stopRecording = async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    console.log("🛑 음성 녹음 중지");

    setIsRecording(false);

    // 오디오 캡처 중지
    if (audioSystemRef.current) {
      const { stream, audioContext, processor } = audioSystemRef.current;
      await stopAudioCapture(stream, audioContext, processor);
      audioSystemRef.current = null;
    }

    // 브라우저 스피치 인식 중지
    if (recogActiveRef.current) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.warn("브라우저 스피치 인식 중지 실패:", e);
      }
    }

    // 서버에 음성 발화 종료 알림
    const endSent = webSocketService.stopSpeaking(hasAudioRef.current);
    console.log("📤 input_audio_buffer.end 전송:", endSent);
    
    hasAudioRef.current = false;
    audioDataCountRef.current = 0;
    stoppingRef.current = false;

    // 상위 컴포넌트에 중지 알림
    onListeningStop?.();
  };

  const handleMicClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const isActive = isRecording || currentStep === "listening" || currentStep === "processing";

  return (
    <>
    <button 
      onClick={handleMicClick} 
      className={`flex items-center px-[37px] py-[24px] text-[28px] font-bold w-[195px] h-[91px] rounded-[100px] border-[3px] border-white bg-yellow
        ${isActive 
          ? 'shadow-[0_0_80px_0_yellow]' //drop shadow 적용
          : ''
        }`} 
      //disabled={isActive} //처리 중일 때는 비활성화
      style={{overflow: 'visible'}} //shadow 잘림 방지
    >
      <img 
        src={isActive ? stopIcon : micIcon} 
        alt="Mic" 
        className={isActive?"w-[15px] h-[15px] mr-[18px]":"w-[32px] h-[32px] mr-[4.5px]"}
      />
      {isActive ? "인식중" : "말하기"}
    </button>
    </>
  );
}
