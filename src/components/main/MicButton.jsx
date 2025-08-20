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
    const base64 = arrayBufferToBase64 (pcmBuffer);
    onAudioData?.(base64);
  };
  
  return { stream, audioContext, processor };
}

async function stopAudioRecognition(stream,audioContext,processor) {
  try { if (processor) { processor.onaudioprocess = null; processor.disconnect(); } } catch {}
  try { if (stream) stream.getTracks().forEach(t => t.stop()); } catch {}
  try {
    if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
    }
  } catch {}
}

export default function MicButton({ onListeningStart, onListeningStop, onTranscriptUpdate, currentStep }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const transcriptsRef = useRef({});
  const audioSystemRef = useRef(null);
  const stoppingRef=useRef(false);
  const currentOutputIndex = useRef(0);

  useEffect(() => {
    if (currentStep !== "listening" && isRecording) {
        stopRecording();
    }
    // Speech Recognition 초기화 (텍스트 변환용)
    const handleInputTranscriptDelta = (data) => {
        console.log('음성 -> 텍스트 결과:', transcriptText);
        console.log('음성 -> 텍스트 : ', data);
        
        const { output_index, delta } = data;

        if (!transcriptsRef.current[output_index]) {
            transcriptsRef.current[output_index] = '';
        }

        if (delta) {
            transcriptsRef.current[output_index] += delta;
            const newText = transcriptsRef.current[output_index];

            console.log("누적 텍스트: ", newText);
            setTranscriptText(newText);

            if (onTranscriptUpdate) {
                onTranscriptUpdate(newText);
            }
        }
    };

    const handleInputTranscriptDone = (data) => {
        console.log('음성 인식 완료', data);
        const { output_index } = data;

        const finalText = transcriptsRef.current[output_index] || '';
        console.log("최종 인식 결과 텍스트: ", finalText);

        if (finalText && onListeningStop) {
            onListeningStop(finalText.trim());
        }

        setTranscriptText('');
        currentOutputIndex.current++;
    }

    const handleError = (data) => {
        console.error('음성 인식 오류', data);
        if (isRecording) {
            stopRecording(); // 오류 발생 시 녹음 중지
        }
    }

    webSocketService.on('openai:conversation', 'input_audio_transcript.delta', handleInputTranscriptDelta);
    webSocketService.on('openai:conversation', 'input_audio_transcript.done', handleInputTranscriptDone);
    webSocketService.on('openai:error', handleError);

    return () => {
      // 컴포넌트 언마운트 시 정리
      webSocketService.off('openai:conversation', 'input_audio_transcript.delta', handleInputTranscriptDelta);
      webSocketService.off('openai:conversation', 'input_audio_transcript.done', handleInputTranscriptDone);
      webSocketService.off('openai:error', handleError);

      if (audioSystemRef.current) {
        const { stream, audioContext, processor } = audioSystemRef.current;
        stopAudioRecognition(stream, audioContext, processor);
      }
    };
  }, [currentStep]);

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
      setTranscriptText(''); // 이전 텍스트 초기화
      transcriptsRef.current = {}; //전체 초기화

      // 부모 컴포넌트에 녹음 시작 알림
      onListeningStart?.()

      // WebSocket으로 음성 발화 시작 알림
      webSocketService.startSpeaking();

      // 오디오 녹음 시작
      const audioSystem = await startAudioRecognition((base64AudioData) => {
        const success = webSocketService.sendAudioPCM16(base64AudioData);

        if (!success) {
            console.error("오디오 청크 전송 실패");
        }
    });
      
      audioSystemRef.current = audioSystem;
    }
    catch (error) {
      console.error('녹음 시작 실패:', error);
      setIsRecording(false);
      alert('마이크 접근 권한이 필요합니다.');
    }
  };

  {/*정지*/}
  const stopRecording = async() => {
    if (stoppingRef.current) return; //이미 정지 처리중
    stoppingRef.current=true;

    console.log('녹음 중지');
    setIsRecording(false);

    // 오디오 시스템 정리
    if (audioSystemRef.current) {
      const { stream, audioContext, processor } = audioSystemRef.current;
      await stopAudioRecognition(stream, audioContext, processor);
      audioSystemRef.current = null;
    }

    // WebSocket으로 음성 발화 종료 알림
    webSocketService.stopSpeaking();
    onListeningStop?.();
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
  const isActive = currentStep === 'listening' || isRecording;
    
  return (
    <button 
      onClick={handleMicClick} 
      className={`flex items-center px-[37px] py-[24px] text-[28px] font-bold w-[195px] h-[91px] rounded-[100px] border-[3px] border-white bg-yellow
        ${isActive 
          ? 'shadow-[0_0_80px_0_yellow]' //drop shadow 적용 
          : ''
        }`}
      //disabled={isActive} // 처리 중일 때는 비활성화
      style={{overflow: 'visible'}} //shadow 잘림 방지
    >
      <img 
        src={isActive ? stopIcon : micIcon} 
        alt="Mic Icon" 
        className={isActive?"w-[15px] h-[15px] mr-[18px]":"w-[32px] h-[32px] mr-[4.5px]"}
      />
      {isActive ? '인식중' : '말하기'}
    </button>
  );
}