import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Call from "./call/CallGuide";
import ChatSummary from "./chat_summary";
import Place from "./place/PlaceGuide";
import Recommend from "./recommend/Recommend";
import SonjuBubble from "./SonjuBubble";
import SonjuListening from "./SonjuListening";
import UserBubble from "./UserBubble";
import webSocketService from "../../service/websocketService";

export default function ChatRoom({ voiceStarted, voiceStopped, onRecognitionComplete }) {
  const [messages, setMessages] = useState([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [currentAiResponse, setCurrentAiResponse] = useState('');
  const [currentOutputIndex, setCurrentOutputIndex] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [officeInfo, setOfficeInfo] = useState(null);
  const [showCall, setShowCall] = useState(false);
  const { initialMessage } = useParams();
  const [isListening, setIsListening] = useState(false);
  const [hasInitMessage, setHasInitMessage] = useState(false);

  // 전역 "전화 의도" 이벤트 수신
  useEffect(() => {
    const onCallIntent = (e) => {
      const t = (e?.detail || '전화').trim();
      setShowCall(true);
      // 타임라인에도 사용자 발화 추가
      setMessages((prev) => [...prev, { 
        type: 'user', 
        content: t, 
        timestamp: new Date(),
        id: Date.now() // 고유 ID 추가
      }]);
      // 서버에 텍스트로도 보내기
      try { 
        webSocketService.sendText(t.includes('전화번호') ? t : '전화번호 알려줘'); 
      } catch {}
    };
    window.addEventListener('sonju:call_intent', onCallIntent);
    return () => window.removeEventListener('sonju:call_intent', onCallIntent);
  }, []);

  // 음성 시작/중지 신호 처리
  useEffect(() => {
    if (voiceStarted) {
      console.log('[ChatRoom] 음성 인식 시작됨');
      setIsListening(true);
      try { 
        webSocketService.resumeAudioContextIfNeeded?.(); 
      } catch {}
    }
  }, [voiceStarted]);

  useEffect(() => {
    if (voiceStopped) {
      console.log('[ChatRoom] 음성 인식 중지됨');
      setIsListening(false);
    }
  }, [voiceStopped]);

  // 초기 메시지 처리 (메인에서 전달받은 메시지)
  useEffect(() => {
    if (initialMessage && !hasInitMessage) {
      const decodedMessage = decodeURIComponent(initialMessage);
      console.log('초기 메시지:', decodedMessage);

      // 초기 메시지를 UserBubble로 추가
      setMessages(prev => [...prev, {
        type: 'user',
        content: decodedMessage,
        timestamp: new Date(),
        id: `init-${Date.now()}` // 고유 ID
      }]);

      setHasInitMessage(true);
      
      // 서버로 텍스트 전송
      if (webSocketService.isConnected) {
        webSocketService.sendText(decodedMessage);
      } else {
        // WebSocket이 연결되지 않은 경우 연결 후 전송
        webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL).then(() => {
          webSocketService.sendText(decodedMessage);
        });
      }
    }
  }, [initialMessage, hasInitMessage]);

  // WebSocket 핸들러
  useEffect(() => {
    if (!webSocketService.isConnected) {
      webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
    }

    // 사용자 음성 인식 완료 처리
    const handleUserVoiceComplete = (data) => {
      const text = (data?.transcript || "").trim();
      
      if (text) {
        console.log('사용자 음성 인식 완료:', text);
        
        // 새로운 사용자 메시지 추가
        setMessages(prev => [...prev, {
          type: 'user',
          content: text,
          timestamp: new Date(),
          id: `voice-${Date.now()}` // 고유 ID
        }]);
        
        // 서버로 텍스트 전송
        webSocketService.sendText(text);
      }
      
      setIsListening(false);
      onRecognitionComplete?.(text);
    };

    // AI 응답 스트리밍 처리
    const handleTextResponse = (data) => {
      console.log('GPT 텍스트 응답 스트리밍:', data);
      
      if (data.delta) {
        setIsAiResponding(true);
        setCurrentOutputIndex(data.output_index);
        setCurrentAiResponse(prev => prev + data.delta);
      }
    };

    // AI 응답 완료 처리
    const handleTextDone = (data) => {
      console.log('GPT 응답 완료:', data);
      
      // 완성된 AI 응답을 메시지에 추가
      if (currentAiResponse.trim()) {
        setMessages(prev => [...prev, {
          type: 'ai',
          content: currentAiResponse,
          timestamp: new Date(),
          outputIndex: data.output_index,
          id: `ai-${Date.now()}` // 고유 ID
        }]);
      }

      // 상태 초기화
      setIsAiResponding(false);
      setCurrentAiResponse('');
      setCurrentOutputIndex(null);
    };

    // 추천 질문 처리
    const handleSuggestedQuestions = (data) => {
      console.log('제안 질문들:', data);
      if (data.questions && Array.isArray(data.questions)) {
        setSuggestedQuestions(data.questions);
      }
    };

    // 동사무소 정보 처리
    const handleOfficeInfo = (data) => {
      console.log('동사무소 정보:', data);
      if (data.tel || data.pos) {
        setOfficeInfo({ 
          tel: data.tel, 
          pos: data.pos 
        });
      }
    };

    // 에러 처리
    const handleError = (data) => {
      console.error('서버 에러:', data);
      setIsAiResponding(false);
      setCurrentAiResponse('');
      alert(`오류가 발생했습니다: ${data.message || '알 수 없는 오류'}`);
    };

    // 핸들러 등록
    webSocketService.on('openai:conversation', 'input_audio_transcript.done', handleUserVoiceComplete);
    webSocketService.on('openai:conversation', 'response.audio_transcript.delta', handleTextResponse);
    webSocketService.on('openai:conversation', 'response.done', handleTextDone);
    webSocketService.on('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
    webSocketService.on('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
    webSocketService.on('openai:error', handleError);

    return () => {
      // 핸들러 제거
      webSocketService.off('openai:conversation', 'input_audio_transcript.done', handleUserVoiceComplete);
      webSocketService.off('openai:conversation', 'response.audio_transcript.delta', handleTextResponse);
      webSocketService.off('openai:conversation', 'response.done', handleTextDone);
      webSocketService.off('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
      webSocketService.off('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
      webSocketService.off('openai:error', handleError);
    };
  }, [onRecognitionComplete, currentAiResponse]);

  // 추천 질문 클릭 처리
  const handleQuestionClick = (question) => {
    console.log('추천 질문 클릭:', question);
    
    // 사용자 메시지로 추가
    setMessages(prev => [...prev, {
      type: 'user',
      content: question,
      timestamp: new Date(),
      id: `suggested-${Date.now()}` // 고유 ID
    }]);
    
    // 추천 질문 숨기기
    setSuggestedQuestions([]);
    
    // 서버로 전송
    webSocketService.sendText(question);
  };

  return (
    <div className="flex flex-col rounded-tl-[30px] rounded-tr-[30px] w-full h-full relative z-0 bg-gray100"
         style={{ boxShadow: "0 4px 10px 0px rgba(0, 0, 0, 0.15)" }}>
      
      <div className="flex-shrink-0 flex items-center justify-center pt-[25px]">
        <div className="font-small font-light text-[13px] text-gray400 pb-[27px]">
          AI가 생성한 응답입니다. 중요한 정보는 꼭 확인해주세요.
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-[90px] w-full">
        {/* 메시지들과 특수 컴포넌트들을 순서대로 렌더링 */}
        {messages.map((message, index) => (
          <div key={message.id}>
            {/* 일반 메시지 렌더링 */}
            {message.type === 'user' ? (
              <UserBubble text={message.content} />
            ) : (
              <SonjuBubble text={message.content} />
            )}
            
            {/* 해당 AI 응답 후에 특수 컴포넌트들 표시 */}
            {message.type === 'ai' && (
              <>
                {/* 동사무소 위치 정보 - 위치 관련 응답 후 표시 */}
                {officeInfo?.pos && !showCall && (
                  <Place 
                    communityCenter="가까운 동사무소" 
                    phoneNumber={officeInfo.tel}
                    position={officeInfo.pos} 
                  />
                )}

                {/* 전화번호 관련 UI - 전화 관련 응답 후 표시 */}
                {showCall &&  (
                  officeInfo?.tel ? (
                    <Call communityCenter="가까운 동사무소" number={officeInfo.tel} />
                  ) : (
                    <SonjuBubble text="전화번호를 조회하고 있어요…" />
                  )
                )}

                {/* 추천 질문들 - 마지막 AI 응답 후에만 표시 */}
                {index === messages.length - 1 && suggestedQuestions.length > 0 && (
                  <div className="px-6 mb-[24px]">
                    <div className="font-bold text-[#000000] text-[22px] mb-4">
                      다음 대화는 어떠세요?
                    </div>
                    <div className="flex gap-2 justify-between items-center">
                      {suggestedQuestions.slice(0, 2).map((question, questionIndex) => (
                        <button
                          key={questionIndex}
                          onClick={() => handleQuestionClick(question)}
                          className="p-3 text-left font-bold text-[22px] text-gray500 bg-gray200 rounded-[10px] cursor-pointer hover:bg-gray300 w-[176px] h-[103px] flex items-center justify-center"
                          style={{ wordBreak: 'keep-all' }}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        
        {/* 현재 AI 응답 스트리밍 중인 경우 */}
        {isAiResponding && currentAiResponse && (
          <SonjuBubble text={currentAiResponse} />
        )}
        
        {/* 채팅 요약 버튼 (메시지가 3개 이상일 때만 표시) */}
        {messages.length >= 6 && <ChatSummary />}
      </div>
      
      {/* 음성 인식 중일 때 표시 */}
      {isListening && (
        <div className="absolute bottom-0 w-full flex justify-center z-40">
          <SonjuListening />
        </div>
      )}
    </div>
  );
}