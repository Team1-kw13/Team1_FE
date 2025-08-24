import { useEffect, useState, useRef } from "react"
import Header from "../../components/main/Header"
import Intro from "../../components/main/Intro"
import ServicingSun from "../../components/main/ServicingSun"
import ServiceButtons from "../../components/main/ServiceButtons"
import Servicing from "../../components/main/Servicing"
import BottomNav from "../../components/main/BottomNav"
import webSocketService from "../../service/websocketService"
import { useNavigate } from "react-router-dom"

export default function Page() {
  const [currentStep, setCurrentStep] = useState('intro');
  const [recognizedText, setRecognizedText] = useState('');
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [isRecognitionComplete, setIsRecognitionComplete] = useState(false);
  const isInitialized = useRef(false);
  const navigate = useNavigate(); //페이지 전환 방식 수정

    const sendLocationSafely = async () => {
    try {
      console.log('위치 정보 전송 시도...');
      
      // WebSocket 연결 상태 확인
      if (!webSocketService.isConnected) {
        console.log('WebSocket 연결 대기 중...');
        return;
      }

      // Geolocation 지원 확인
      if (!navigator.geolocation) {
        console.warn('이 브라우저는 위치 서비스를 지원하지 않습니다');
        return;
      }

      // 위치 정보 요청 (더 관대한 설정)
      const position = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('위치 정보 요청 타임아웃 (20초)'));
        }, 20000); // 20초로 연장

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (error) => {
            clearTimeout(timeoutId);
            
            // 에러 코드별 처리
            switch(error.code) {
              case error.PERMISSION_DENIED:
                console.warn('❌ 사용자가 위치 정보 액세스를 거부했습니다');
                break;
              case error.POSITION_UNAVAILABLE:
                console.warn('❌ 위치 정보를 사용할 수 없습니다');
                break;
              case error.TIMEOUT:
                console.warn('❌ 위치 정보 요청이 타임아웃되었습니다');
                break;
              default:
                console.warn('❌ 알 수 없는 위치 오류:', error.message);
                break;
            }
            
            reject(error);
          },
          {
            enableHighAccuracy: false, // 정확도보다 속도 우선
            timeout: 15000, // 15초
            maximumAge: 600000 // 10분간 캐시 사용
          }
        );
      });

      const { latitude, longitude } = position.coords;

      try {
        webSocketService.sendUserLocation(latitude, longitude);
        console.log('위치 정보 서버 전송 완료');
      } catch (sendError) {
        console.error('❌ 위치 정보 서버 전송 실패:', sendError);
      }

    } catch (error) {
      console.warn('⚠️ 위치 정보 전송 실패:', error.message);
      // 위치 정보 전송 실패해도 앱은 계속 동작
    }
  };

  useEffect(() => {
    if (isInitialized.current) return; // 이미 초기화된 경우 중복 실행 방지
    isInitialized.current = true;

    const initializeWebSocket = async () => {
      try {
        await webSocketService.connect();
        setTimeout(() => {
          sendLocationSafely();
        }, 1000);
      } catch (error) {
        console.error('WebSocket 연결 실패:', error);
      }
    };

    initializeWebSocket();

    // 사용자 음성 → 텍스트 변환 결과 처리
    const handleInputTranscriptDelta = (data) => {
      console.log('음성 -> 텍스트 결과:', data);
      if (data.delta) {
        setRealtimeTranscript(prev => prev + data.delta);
        if (currentStep === 'listening') {
          setCurrentStep('processing');
        }
      }
    };

    //핸들러 등록
    webSocketService.on('openai:conversation', 'input_audio_transcript.delta', handleInputTranscriptDelta);

    return () => {
      // 핸들러 제거
      webSocketService.off('openai:conversation', 'input_audio_transcript.delta', handleInputTranscriptDelta);
      isInitialized.current = false; // 컴포넌트 언마운트 시 초기화 상태 리셋
    };
  }, [currentStep, realtimeTranscript]);

  //마이크 버튼에서 호출할 함수들
  const handleListeningStart = () => {
    setCurrentStep('listening');
    setRecognizedText('');
    setRealtimeTranscript('');
    setIsRecognitionComplete(false);
  };

 const handleListeningStop = (finalText = '') => {
   // 최종 텍스트를 화면에 보여주기
   setRecognizedText(finalText);
   setRealtimeTranscript(finalText);
   setCurrentStep('processing');
   setIsRecognitionComplete(true);

   // 3000ms 후 채팅 페이지로 이동
   setTimeout(() => {
     navigate('/chatroompage', {
        state: { 
          transcript: finalText,
          timestamp: Date.now()
        },
        replace: true
      });
    }, 3000);
   };

  const handleTranscriptUpdate = (newTranscript) => {
    setRealtimeTranscript(newTranscript);
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

  //전화 의도 처리
  const handleCallIntent = (transcript) => {
    console.log('메인 페이지: 전화 의도 감지:', transcript);
    
    // 즉시 채팅 페이지로 이동하면서 전화 의도 전달
    navigate('/chatroompage', {
      state: { 
        transcript: transcript,
        isCallIntent: true, // 전화 의도 플래그
        timestamp: Date.now()
      },
      replace: true
    });
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
              recognizedText={realtimeTranscript}
            />
          </>
        );
      case 'processing':
        return (
          <>
            <ServicingSun />
            <Servicing 
              isComplete={isRecognitionComplete}
              recognizedText={isRecognitionComplete ? recognizedText : realtimeTranscript}
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
      <Header/>
      {renderMainContent()}
      <BottomNav 
        onListeningStart={handleListeningStart}
        onListeningStop={handleListeningStop}
        onTranscriptUpdate={handleTranscriptUpdate}
        onRecognitionError={handleRecognitionError}
        onCallIntent={handleCallIntent}
        currentStep={currentStep}
      />
    </div>
  )
}