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
async function startAudioRecognition(onAudioData) {
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

// 오디오 캡처 정지/정리
async function stopAudioRecognition(stream, audioContext, processor) {
  try { if (processor) { processor.onaudioprocess = null; processor.disconnect(); } } catch {}
  try { if (stream) stream.getTracks().forEach(t => t.stop()); } catch {}
  try {
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }
  } catch {}
}

export default function MicButton({ onListeningStart, onListeningStop, onTranscriptUpdate, currentStep,onCallIntent }) {
  const [isRecording, setIsRecording] = useState(false);
  const audioSystemRef = useRef(null);
  //첫PCM청크가 서버에 도달하기 전에 stopSpeaking()을 안보내도록
  const hasAudioRef=useRef(false); 
  const stoppingRef = useRef(false);
  const audioDataSentRef = useRef(false);

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
        if (/전화번호|전화해|전화 걸어|전화/i.test(transcript)) {
          try { window.dispatchEvent(new CustomEvent('sonju:call_intent', { detail: transcript })); } catch {}
          onCallIntent?.(transcript);
        }
      };

      rec.onerror = (event) => {
        console.error("스피치 인식 에러:", event.error);
      };

      rec.onstart = () => { recogActiveRef.current = true; };
      rec.onend   = () => { recogActiveRef.current = false; };

      recognitionRef.current = rec;
    }

    return () => {
      if (audioSystemRef.current) {
        const { stream, audioContext, processor } = audioSystemRef.current;
        stopAudioRecognition(stream, audioContext, processor);
      }
    };
  }, [onListeningStop, onTranscriptUpdate, onCallIntent]);

  const startRecording = async () => {
    try {
      if (stoppingRef.current) return;

      // WebSocket 연결 (필요 시)
      if (!webSocketService.isConnected) {
        await webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
      }
      setIsRecording(true);
      onListeningStart?.();

      hasAudioRef.current = false;
      audioDataSentRef.current = false;

      // 서버로 “녹음 시작” 알림 (시작 시 commit 보내지 않기)
      webSocketService.startSpeaking();

      // 오디오 캡처 시작 후 청크를 서버로 전송
      const audioSystem = await startAudioRecognition((arrayBuffer) => {
        const ok=webSocketService.sendAudioPCM16(arrayBuffer);
        if(ok) { 
          hasAudioRef.current=true; //최소 1청크 보냈음 표시
          audioDataSentRef.current=true;
        }
      });
      audioSystemRef.current = audioSystem;

      // 브라우저 스피치 인식 시작 (즉시 텍스트 얻기)
      try { recognitionRef.current?.start(); } catch {}

    } catch (e) {
      console.error("녹음 시작 실패:", e);
      setIsRecording(false);
      alert("마이크 접근 권한이 필요합니다.");
    }
  };

  const stopRecording = async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    setIsRecording(false);

    if (audioSystemRef.current) {
      const { stream, audioContext, processor } = audioSystemRef.current;
      await stopAudioRecognition(stream, audioContext, processor);
      audioSystemRef.current = null;
    }

    // 브라우저 스피치 인식 정지
    if (recogActiveRef.current) { try { recognitionRef.current?.stop(); } catch {} }

    // 서버로 녹음 끝 알림 (commit -> end)
    //webSocketService.stopSpeaking(hasAudioRef.current);
    if (audioDataSentRef.current) {
      webSocketService.stopSpeaking(true);
    } else {
      webSocketService.stopSpeaking(false);
    }

    hasAudioRef.current=false;
    audioDataSentRef.current=false;
    stoppingRef.current = false;
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
