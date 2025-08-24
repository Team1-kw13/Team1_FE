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
  const {initialMessage} = useParams();
  const [isListening, setIsListening] = useState(false);
  const [hasInitMessage, setHasInitMessage] = useState(false);

  // 전역 “전화 의도” 이벤트 수신
  useEffect(() => {
    const onCallIntent = (e) => {
      const t = (e?.detail || '전화').trim();
      setShowCall(true); // 🔴 바로 Call UI 열기
      // 타임라인에도 사용자 발화 추가(선택)
      setMessages((prev) => [...prev, { type: 'user', content: t, timestamp: new Date() }]);
      // 서버에 텍스트로도 보내 tel을 받도록 유도(오디오 실패해도 안전)
      try { webSocketService.sendText(t.includes('전화번호') ? t : '전화번호 알려줘'); } catch {}
    };
    window.addEventListener('sonju:call_intent', onCallIntent);
    return () => window.removeEventListener('sonju:call_intent', onCallIntent);
  }, []);

  // 🔥 음성 시작/중지 신호를 props로 받아서 처리
  useEffect(() => {
    if (voiceStarted) {
      console.log('[ChatRoom] 음성 인식 시작됨');
      setIsListening(true);
      try { webSocketService.resumeAudioContextIfNeeded?.(); } catch {}
    }
  }, [voiceStarted]);

  useEffect(() => {
    if (voiceStopped) {
      console.log('[ChatRoom] 음성 인식 중지됨');
    }      
    setIsListening(false);
  }, [voiceStopped]);

  // 초기 메시지 처리
  useEffect(() => {
    if (initialMessage && !hasInitMessage) {
      const decodedMessage = decodeURIComponent(initialMessage);
      console.log('초기 메세지: ', decodedMessage);

      setMessages(prev => [...prev, {
        type: 'user',
        content: decodedMessage,
        timestamp: new Date()
      }]);

      setHasInitMessage(true);

      // setTimeout(() => {
      //   if (webSocketService.isConnected) {
      //     webSocketService.sendText(decodedMessage);
      //   }
      // }, 500);
    }
  }, [initialMessage, hasInitMessage]);

  // WebSocket 핸들러
  useEffect(() => {
    if (!webSocketService.isConnected) {
      webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
    }
    
    // const handleUserVoiceTranscript = (data) => {
    //   console.log('사용자 음성 인식 실시간: ', data);
    // };    
    
    const handleUserVoiceComplete = (data) => {
      const text = (data?.transcript || "").trim();
      
      if (text) {
        setMessages(prev => [...prev, {
          type : 'user', 
          content: text, 
          timestamp: new Date(),
          outputIndex: data.outputIndex
        }])
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
      
      // 🔥 currentAiResponse를 직접 참조하는 대신 상태 업데이트에서 처리
      setMessages(prev => {
        const updated = [...prev];
        const aiMessageIndex = updated.findIndex(
          msg => msg.type === "ai" && msg.outputIndex === data.output_index
        );

        if (aiMessageIndex >= 0) {
          // 이미 존재 → 이어붙임
          updated[aiMessageIndex].content += currentAiResponse;
        } else {
          // 새로 추가
          updated.push({
            type: "ai",
            content: currentAiResponse,
            outputIndex: data.output_index,
            timestamp: new Date(),
          });
        }
        return updated;
      });

      setCurrentAiResponse('');
      setCurrentOutputIndex(null);
    };

    const handleCallIntent = (transcript) => {
      setShowCall(true);
      const ask = transcript || '가까운 동사무소 전화번호 알려줘';
      setMessages(prev => [...prev, { type: 'user', content: ask, timestamp: new Date() }]);
      webSocketService.sendText(ask);
    };

    const handleSuggestedQuestions = (data) => {
      console.log('제안 질문들:', data);
      if (data.questions) {
        setSuggestedQuestions(data.questions);
      }
    };

    const handleOfficeInfo = (data) => {
      console.log('동사무소 정보:', data);
      setOfficeInfo({ tel: data.tel, pos: data.pos });
    };

    const handleError = (data) => {
      console.error('서버 에러:', data);
      alert(`오류가 발생했습니다: ${data.message}`);
    };

    // 핸들러 등록
    //webSocketService.on('openai:conversation','input_audio_transcript.delta', handleUserVoiceTranscript);
    webSocketService.on('openai:conversation', 'input_audio_transcript.done', handleUserVoiceComplete);
    webSocketService.on('openai:conversation', 'response.audio_transcript.delta', handleTextResponse);
    webSocketService.on('openai:conversation', 'response.done', handleTextDone);
    webSocketService.on('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
    webSocketService.on('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
    webSocketService.on('openai:error', handleError);

    return () => {
    //  webSocketService.off('openai:conversation','input_audio_transcript.delta', handleUserVoiceTranscript);
      webSocketService.off('openai:conversation', 'input_audio_transcript.done', handleUserVoiceComplete);
      webSocketService.off('openai:conversation', 'response.audio_transcript.delta', handleTextResponse);
      webSocketService.off('openai:conversation', 'response.done', handleTextDone);
      webSocketService.off('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
      webSocketService.off('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
      webSocketService.off('openai:error', handleError);
    };    
  }, [onRecognitionComplete, currentAiResponse]);

  const handleQuestionClick = (question) => {
    setMessages(prev => [...prev, {
      type: 'user',
      content: question,
      timestamp: new Date(),
      outputIndex: prev.length
    }]);
    setSuggestedQuestions([]);
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
          message.type === 'user' ? (
            <UserBubble key={index} text={message.content} />
          ) : (
            <SonjuBubble key={index} text={message.content} />
          )
        ))}
        
        {isAiResponding && currentAiResponse && (
          <SonjuBubble text={currentAiResponse} isTyping={true} />
        )}

        {officeInfo?.pos && !showCall && (
          <Place communityCenter="가까운 동사무소" position={officeInfo.pos} />
        )}

        {showCall && (
          officeInfo?.tel
            ? <Call communityCenter="가까운 동사무소" number={officeInfo.tel} />
            : <SonjuBubble text="전화번호를 조회하고 있어요…" />
        )}

        {suggestedQuestions.length > 0 && (
          <div className="mt-[40px] px-6">
            <div className="font-bold text-[#000000] text-[22px] mb-4">
              다음 대화는 어떠세요?
            </div>
            <div className="flex gap-2 justify-between items-center pb-[24px]">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuestionClick(question)}
                  className="p-3 text-left font-bold text-[22px] text-gray500 bg-gray200 rounded-[10px] cursor-pointer hover:bg-gray300 w-[176px]"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <ChatSummary />
      </div>
      
      {isListening && (
        <div className="absolute bottom-0 w-full flex justify-center z-40">
          <SonjuListening />
        </div>
      )}
   
    </div>
  );
}