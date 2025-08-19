import { useState, useEffect } from "react";
import Call from "./call/CallGuide";
import ChatSummary from "./chat_summary";
import Place from "./place/PlaceGuide";
import Recommend from "./recommend/Recommend";
import SonjuBubble from "./SonjuBubble";
import SonjuListening from "./SonjuListening";
import UserBubble from "./UserBubble";
import webSocketService from "../../service/websocketService";

export default function ChatRoom({ initialUserMessage }) {
  const [messages, setMessages] = useState([]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [currentAiResponse, setCurrentAiResponse] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [officeInfo, setOfficeInfo] = useState(null);

  useEffect(() => {
    // WebSocket 연결 확인
    if (!webSocketService.isConnected) {
      webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
    }

    // GPT 텍스트 응답 처리 (실시간)
    const handleTextResponse = (data) => {
      console.log('GPT 텍스트 응답:', data);
      if (data.delta) {
        setCurrentAiResponse(prev => prev + data.delta);
        setIsAiResponding(true);
      }
    };

    // GPT 응답 완료
    const handleTextDone = () => {
      console.log('GPT 응답 완료');
      setIsAiResponding(false);
      
      // 완성된 응답을 메시지 목록에 추가
      if (currentAiResponse) {
        setMessages(prev => [...prev, {
          type: 'ai',
          content: currentAiResponse,
          timestamp: new Date()
        }]);
        setCurrentAiResponse('');
      }
    };

    // 제안 질문 처리
    const handleSuggestedQuestions = (data) => {
      console.log('제안 질문들:', data);
      if (data.questions) {
        setSuggestedQuestions(data.questions);
      }
    };

    // 동사무소 정보 처리
    const handleOfficeInfo = (data) => {
      console.log('동사무소 정보:', data);
      setOfficeInfo({
        tel: data.tel,
        position: data.pos // [위도, 경도]
      });
    };

    // 에러 처리
    const handleError = (data) => {
      console.error('서버 에러:', data);
      alert(`오류가 발생했습니다: ${data.message}`);
    };

    // 핸들러 등록
    webSocketService.on('openai:conversation', 'response.text.delta', handleTextResponse);
    webSocketService.on('openai:conversation', 'response.text.done', handleTextDone);
    webSocketService.on('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
    webSocketService.on('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
    webSocketService.on('openai:error', handleError);

    // 컴포넌트 언마운트 시 핸들러 제거
    return () => {
      webSocketService.off('openai:conversation', 'response.text.delta', handleTextResponse);
      webSocketService.off('openai:conversation', 'response.text.done', handleTextDone);
      webSocketService.off('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
      webSocketService.off('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
      webSocketService.off('openai:error', handleError);
    };
  }, [currentAiResponse]);

  useEffect(() => {
    if (initialUserMessage) {
      setMessages(prev => [...prev, {
        type: 'user',
        content: initialUserMessage,
        timestamp: new Date()
      }]);

      webSocketService.sendText(initialUserMessage);
    }
  }, [initialUserMessage]);

  // 제안 질문 클릭 처리
  const handleQuestionClick = (question) => {
    // 사용자 메시지로 추가
    setMessages(prev => [...prev, {
      type: 'user',
      content: question,
      timestamp: new Date()
    }]);

    // WebSocket으로 질문 전송
    webSocketService.sendText(question);
    
    // 제안 질문 초기화
    setSuggestedQuestions([]);
  };

  return (
    <div className="flex flex-col rounded-tl-[30px] rounded-tr-[30px] w-full h-full relative z-30 bg-gray100"
         style={{ boxShadow: "0 4px 10px 0px rgba(0, 0, 0, 0.15)" }}>
      
      <div className="flex-shrink-0 flex items-center justify-center pt-[25px]">
        <div className="font-small font-light text-[13px] text-gray400 pb-[27px]">
          AI가 생성한 응답입니다. 중요한 정보는 꼭 확인해주세요.
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-[90px] w-full">
        {/* 기존 예시 메시지들 (개발용) */}
        <UserBubble text="우왕 성공이다. 이거 컴포넌트 설정해놔서 알아서 늘어났다가 줄어들었다가 함 루룰" />
        <UserBubble text="등본 떼줘" />
        
        {/* 실시간 메시지들 */}
        {messages.map((message, index) => (
          message.type === 'user' ? (
            <UserBubble key={index} text={message.content} />
          ) : (
            <SonjuBubble key={index} text={message.content} />
          )
        ))}
        
        {/* 현재 AI 응답 중 */}
        {isAiResponding && (
          <SonjuBubble text={currentAiResponse} isTyping={true} />
        )}
        
        {/* 제안 질문들 */}
        {suggestedQuestions.length > 0 && (
          <div className="mt-[40px] px-6">
            <div className="font-bold text-[#000000] text-[22px] mb-4">
              다음 대화는 어떠세요?
            </div>
            <div className="flex flex-col gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuestionClick(question)}
                  className="p-3 text-left font-bold text-[22px] text-gray500 bg-gray200 rounded-[10px] cursor-pointer hover:bg-gray300"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* 동사무소 정보 */}
        {officeInfo && (
          <Place 
            communityCenter="가까운 동사무소" 
            phoneNumber={officeInfo.tel}
            position={officeInfo.position}
          />
        )}
        
        {/* 기존 예시 컴포넌트들 */}
        <Recommend text="등본 발급 시 준비물은 뭐야?" />
        <Recommend text="영업 시간 알려줘" />
        <Recommend text="전화번호 알려줘" />
        <SonjuListening />
        <Place communityCenter="중계1동 주민센터" />
        <Call communityCenter="중계1동 주민센터" number="02-131-2340" />
        <ChatSummary />
      </div>
    </div>
  );
}