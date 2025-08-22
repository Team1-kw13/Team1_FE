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

export default function ChatRoom({ voiceStarted, voiceStopped, onRecognitionComplete, transcriptFromPage }) {
  const [messages, setMessages] = useState([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [currentAiResponse, setCurrentAiResponse] = useState('');
  const [currentOutputIndex, setCurrentOutputIndex] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [officeInfo, setOfficeInfo] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [hasInitMessage, setHasInitMessage] = useState(false);
  
  // 새로운 상태들 - 대화 흐름 관리
  const [completedOutputIndexes, setCompletedOutputIndexes] = useState(new Set());
  const [showRecommendForIndex, setShowRecommendForIndex] = useState(null);
  const [showPlaceForIndex, setShowPlaceForIndex] = useState(null);
  const [showCallForIndex, setShowCallForIndex] = useState(null);
  const [shouldShowSummary, setShouldShowSummary] = useState(false);
  
  const {initialMessage} = useParams();

  // 음성 시작/중지 처리
  useEffect(() => {
    if (voiceStarted) {
      console.log('[ChatRoom] 음성 인식 시작됨');
      setIsListening(true);
    }
  }, [voiceStarted]);

  useEffect(() => {
    if (voiceStopped) {
      console.log('[ChatRoom] 음성 인식 중지됨');
      setIsListening(false);
    }
  }, [voiceStopped]);

  //부모에서 전달된 transcript 처리
  useEffect(() => {
  if (transcriptFromPage) {
    const newOutputIndex = Math.max(...Array.from(completedOutputIndexes), -1) + 1;
    setMessages(prev => [...prev, {
      type: 'user',
      content: transcriptFromPage,
      timestamp: new Date(),
      outputIndex: newOutputIndex
    }]);
    setShowRecommendForIndex(null);
  }
}, [transcriptFromPage]);

  // 초기 메시지 처리
  useEffect(() => {
    if (initialMessage && !hasInitMessage) {
      const decodedMessage = decodeURIComponent(initialMessage);
      console.log('초기 메세지: ', decodedMessage);

      setMessages(prev => [...prev, {
        type: 'user',
        content: decodedMessage,
        timestamp: new Date(),
        outputIndex: 0
      }]);

      setHasInitMessage(true);
    }
  }, [initialMessage, hasInitMessage]);

  // WebSocket 핸들러
  useEffect(() => {
    if (!webSocketService.isConnected) {
      webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
    }
    
    const handleUserVoiceComplete = (data) => {
      const text = (data?.transcript || "").trim();
      
      if (text) {
        // 새로운 outputIndex 계산
        const newOutputIndex = Math.max(...Array.from(completedOutputIndexes), -1) + 1;
        
        setMessages(prev => [...prev, {
          type: 'user', 
          content: text, 
          timestamp: new Date(),
          outputIndex: newOutputIndex
        }]);
        
        // Recommend 숨김 (새로운 음성 입력 시)
        setShowRecommendForIndex(null);
      }
      setIsListening(false);
      onRecognitionComplete?.(text);
    };

    const handleTextResponse = (data) => {
      console.log('GPT 텍스트 응답:', data);
      if (data.delta) {
        setIsAiResponding(true);
        setCurrentOutputIndex(data.outputIndex);
        setCurrentAiResponse(prev => prev + data.delta);
      }
    };

    const handleTextDone = (data) => {
      console.log('GPT 응답 완료');
      setIsAiResponding(false);
      
      setMessages(prev => {
        const updated = [...prev];
        const aiMessageIndex = updated.findIndex(
          msg => msg.type === "ai" && msg.outputIndex === data.output_index
        );

        if (aiMessageIndex >= 0) {
          updated[aiMessageIndex].content += currentAiResponse;
        } else {
          updated.push({
            type: "ai",
            content: currentAiResponse,
            outputIndex: data.output_index,
            timestamp: new Date(),
          });
        }
        return updated;
      });

      // 완료된 outputIndex 추가
      setCompletedOutputIndexes(prev => new Set([...prev, data.output_index]));
      
      // AI 응답 완료 후 Recommend 표시
      setShowRecommendForIndex(data.output_index);
      
      // 대화가 일정 개수 이상이면 summary 표시
      if (data.output_index >= 3) {
        setShouldShowSummary(true);
      }

      setCurrentAiResponse('');
      setCurrentOutputIndex(null);
    };

    const handleSuggestedQuestions = (data) => {
      console.log('제안 질문들:', data);
      if (data.questions) {
        setSuggestedQuestions(data.questions);
      }
    };

    const handleOfficeInfo = (data) => {
      console.log('동사무소 정보:', data);
      setOfficeInfo({
        tel: data.tel,
        position: data.pos
      });
      
      // 현재 진행 중인 outputIndex에 대해 Place 표시
      const currentIndex = Math.max(...Array.from(completedOutputIndexes), 0);
      setShowPlaceForIndex(currentIndex);
    };

    const handleError = (data) => {
      console.error('서버 에러:', data);
      alert(`오류가 발생했습니다: ${data.message}`);
    };

    // 핸들러 등록
    webSocketService.on('openai:conversation', 'input_audio_transcript.done', handleUserVoiceComplete);
    webSocketService.on('openai:conversation', 'response.text.delta', handleTextResponse);
    webSocketService.on('openai:conversation', 'response.text.done', handleTextDone);
    webSocketService.on('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
    webSocketService.on('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
    webSocketService.on('openai:error', handleError);

    return () => {
      webSocketService.off('openai:conversation', 'input_audio_transcript.done', handleUserVoiceComplete);
      webSocketService.off('openai:conversation', 'response.text.delta', handleTextResponse);
      webSocketService.off('openai:conversation', 'response.text.done', handleTextDone);
      webSocketService.off('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
      webSocketService.off('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
      webSocketService.off('openai:error', handleError);
    };    
  }, [onRecognitionComplete, currentAiResponse, completedOutputIndexes]);

  // Recommend 클릭 처리
  const handleQuestionClick = (question) => {
    // 새로운 outputIndex 계산
    const newOutputIndex = Math.max(...Array.from(completedOutputIndexes), -1) + 1;
    
    setMessages(prev => [...prev, {
      type: 'user',
      content: question,
      timestamp: new Date(),
      outputIndex: newOutputIndex
    }]);
    
    // Recommend 숨김
    setShowRecommendForIndex(null);
    setSuggestedQuestions([]);
  };

  // 전화번호 관련 발화 감지 (간단한 키워드 검사)
  useEffect(() => {
    if (officeInfo && showPlaceForIndex !== null) {
      const latestUserMessage = messages
        .filter(msg => msg.type === 'user')
        .slice(-1)[0];
      
      if (latestUserMessage && 
          (latestUserMessage.content.includes('전화') || 
           latestUserMessage.content.includes('번호') ||
           latestUserMessage.content.includes('연락'))) {
        setShowCallForIndex(latestUserMessage.outputIndex);
      }
    }
  }, [messages, officeInfo, showPlaceForIndex]);

  // 컴포넌트별 표시 조건 함수
  const shouldShowRecommendQuestions = () => {
    return showRecommendForIndex !== null && suggestedQuestions.length > 0;
  };

  const shouldShowPlace = () => {
    return showPlaceForIndex !== null && officeInfo;
  };

  const shouldShowCall = () => {
    return showCallForIndex !== null && officeInfo;
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
        {messages.map((message, index) => (
          <div key={`${message.outputIndex}-${message.type}-${index}`}>
            {message.type === 'user' ? (
              <UserBubble text={message.content} />
            ) : (
              <SonjuBubble 
                text={message.content} 
                outputIndex={message.outputIndex}
              />
            )}
          </div>
        ))}
        
        {/* AI 응답 중 표시 */}
        {isAiResponding && currentAiResponse && (
          <SonjuBubble 
            text={currentAiResponse} 
            isTyping={true}
            outputIndex={currentOutputIndex}
          />
        )}
        
        {/* 제안 질문들 - AI 응답 완료 후 표시 */}
        {shouldShowRecommendQuestions() && (
          <div className="mt-[20px]">
            <div className="font-bold text-[#000000] text-[22px] mb-4 px-6">
              다음 대화는 어떠세요?
            </div>
            <div className="flex flex-wrap gap-[16px] px-6">
              {suggestedQuestions.map((question, index) => (
                <Recommend 
                  key={index}
                  text={question}
                  type="question"
                  onClick={() => handleQuestionClick(question)}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* 동사무소 위치 정보 */}
        {shouldShowPlace() && (
          <Place 
            communityCenter="가까운 동사무소" 
            phoneNumber={officeInfo.tel}
            position={officeInfo.position}
          />
        )}
        
        {/* 전화번호 정보 */}
        {shouldShowCall() && (
          <Call 
            communityCenter="가까운 동사무소" 
            number={officeInfo.tel} 
          />
        )}
        
        {/* 고정 추천 질문들 (임시) */}
        <Recommend text="등본 발급 시 준비물은 뭐야?" onClick={() => handleQuestionClick("등본 발급 시 준비물은 뭐야?")} />
        <Recommend text="영업 시간 알려줘" onClick={() => handleQuestionClick("영업 시간 알려줘")} />
        <Recommend text="전화번호 알려줘" onClick={() => handleQuestionClick("전화번호 알려줘")} />
        
        {/* 대화 요약 - 일정 개수 이상 대화 후 표시 */}
        {shouldShowSummary && <ChatSummary />}
      </div>
      
      {/* 음성 듣기 중 표시 */}
      {isListening && (
        <div className="absolute bottom-0 w-full flex justify-center z-40">
          <SonjuListening />
        </div>
      )}
    </div>
  );
}