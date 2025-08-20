import { useEffect, useState, useRef } from "react"
import Header from "../../components/main/Header"
import Intro from "../../components/main/Intro"
import ServicingSun from "../../components/main/ServicingSun"
import ServiceButtons from "../../components/main/ServiceButtons"
import Servicing from "../../components/main/Servicing"
import BottomNav from "../../components/main/BottomNav"
import webSocketService from "../../service/websocketService"
//import { data } from "react-router-dom"

export default function Page() {
  const [currentStep, setCurrentStep] = useState('intro');
  const [recognizedText, setRecognizedText] = useState('');
  const [isRecognitionComplete, setIsRecognitionComplete] = useState(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return; // 이미 초기화된 경우 중복 실행 방지
    isInitialized.current = true;

    const initializeWebSocket = async () => {
      try {
        await webSocketService.connect();
      } catch (error) {
        console.error('WebSocket 연결 실패:', error);
      }
    };

    initializeWebSocket();

    // 사용자 음성 → 텍스트 변환 결과 처리
    const handleAudioTranscript = (data) => {
      console.log('음성 -> 텍스트 결과:', data);
      if (data.delta) {
        setRecognizedText(prev => prev + data.delta);
        if (currentStep === 'listening') {
          setCurrentStep('processing');
        }
      }
    };

    // 응답 완료 처리
    const handleTranscriptDone = (data) => {
      console.log('음성 인식 완료', data);
      setIsRecognitionComplete(true);

      setTimeout(() => {
        window.location.href = '/chatroompage';
      }, 2000);
    };

    const handleConnected = (data) => {
      console.log('WebSocket 연결됨:', data);
    }

    //핸들러 등록
    webSocketService.on('openai:conversation', 'response.audio_transcript.delta', handleAudioTranscript);
    webSocketService.on('openai:conversation', 'response.text.done', handleTranscriptDone);
    webSocketService.on('CONNECTED', handleConnected);

    return () => {
      // 핸들러 제거
      webSocketService.off('openai:conversation', 'response.audio_transcript.delta', handleAudioTranscript);
      webSocketService.off('openai:conversation', 'response.text.done', handleTranscriptDone);
      webSocketService.off('CONNECTED', handleConnected);
      isInitialized.current = false; // 컴포넌트 언마운트 시 초기화 상태 리셋
    };
  }, [currentStep]);

  //마이크 버튼에서 호출할 함수들
  const handleListeningStart = () => {
    setCurrentStep('listening');
    setRecognizedText('');
    setIsRecognitionComplete(false);
  };

  const handleListeningStop = () => {
    console.log('음성 인식 중지');
  };

  // 에러나 타임아웃 처리용
  const handleRecognitionError = (errorMessage) => {
    console.log('❌ 음성 인식 오류:', errorMessage);
    setCurrentStep('processing');
    setRecognizedText(errorMessage);
    
    setTimeout(() => {
      setIsRecognitionComplete(true);
      setTimeout(() => {
        setCurrentStep('intro'); // 에러 시 초기 상태로 복귀
      }, 2000);
    }, 1000);
  };

  //상태에 따라 메인 콘텐츠 렌더링 (컴포넌트 전환)
  const renderMainContent = () => {
    switch (currentStep) {
      case 'listening':
        return (
          <>
            <ServicingSun />
            <Servicing 
              isComplete={isRecognitionComplete}
              recognizedText={recognizedText}
            />
          </>
        );
      case 'processing':
        return (
          <>
            <ServicingSun />
            <Servicing 
              isComplete={isRecognitionComplete}
              recognizedText={recognizedText}
            />
          </>
        );
      default:
        return (
          <>
            <Intro />
            <ServiceButtons />
          </>
        );
      }
  };

  return (
    <div className="flex flex-col h-screen">

      <Header className="shrink-0 h-[119px]"/>

      {/*인트로, 서비스버튼*/}
      {renderMainContent()}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-20">
        <BottomNav 
          onListeningStart={handleListeningStart}
          onListeningStop={handleListeningStop}
          onRecognitionError={handleRecognitionError}
          currentStep={currentStep}
        />
      </div>
      
    </div>
  )
}