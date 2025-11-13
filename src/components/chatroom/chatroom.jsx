import { useState, useEffect,useRef } from "react";
import { useParams } from "react-router-dom";
import Call from "./call/CallGuide";
import ChatSummary from "./chat_summary";
import Place from "./place/PlaceGuide";
import SonjuBubble from "./SonjuBubble";
import SonjuListening from "./SonjuListening";
import UserBubble from "./UserBubble";
import webSocketService from "../../service/websocketService";

export default function ChatRoom({ voiceStarted, voiceStopped, onRecognitionComplete }) {
  const [messages, setMessages] = useState([]);
  const [currentAiResponse, setCurrentAiResponse] = useState('');;
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [officeInfo, setOfficeInfo] = useState(null);
  const [showCall, setShowCall] = useState(false);
  const {initialMessage} = useParams();
  const [isListening, setIsListening] = useState(false);
  const [hasInitMessage, setHasInitMessage] = useState(false);
  const lastFinalRef = useState('');

  // 챗룸 텍스트 처리: 말풍선 + sendText
  const handleFinalText = (t) => {
    const text = (t || '').trim();
    if (!text) return;
    if (lastFinalRef.current === text) return;
    lastFinalRef.current = text;
    setMessages(prev => [...prev, { type: 'user', content: text, timestamp: new Date() }]); //내가 정의한 json메시지 규약
    try { webSocketService.sendText(text); } catch (e) { console.error('sendText failed', e); }
    setIsListening(false);
    setCurrentStep('idle');
    onRecognitionComplete?.(text);
  };

  // 전화 의도 이벤트 수신
  useEffect(() => {
    const onCallIntent = (e) => {
      const t = (e?.detail || '전화').trim();
      setShowCall(true);
      setMessages((prev) => [...prev, { type: 'user', content: t, timestamp: new Date() }]);
      // 서버에 텍스트를 보내 tel을 받도록 유도
      try { webSocketService.sendText(t.includes('전화번호') ? t : '전화번호 알려줘'); } catch {}
    };
    window.addEventListener('sonju:call_intent', onCallIntent);
    return () => window.removeEventListener('sonju:call_intent', onCallIntent);
  }, []);

  useEffect(() => {
    const onFinal = (e) => handleFinalText(e?.detail);
    window.addEventListener('sonju:final_transcript', onFinal);
    return () => window.removeEventListener('sonju:final_transcript', onFinal);
  }, []);

  // 음성 시작/중지 신호를 props로 받아서 처리
  useEffect(() => {
    if (voiceStarted) {
      setIsListening(true);
      try { webSocketService.resumeAudioContextIfNeeded?.(); } catch {}
    }
  }, [voiceStarted]);

  useEffect(() => {
    if (voiceStopped) {
    }
    setIsListening(false);
  }, [voiceStopped]);

  // 초기 메시지 처리 <-꼭 필요?
  useEffect(() => {
    if (initialMessage && !hasInitMessage) {
      const decodedMessage = decodeURIComponent(initialMessage);

      setMessages(prev => [...prev, {
        type: 'user',
        content: decodedMessage,
        timestamp: new Date()
      }]);

      setHasInitMessage(true);
      webSocketService.sendText(decodedMessage);
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

    //gpt 텍스트 응답
    const handleTextResponse = (data) => {
      if (data.delta) {
        setIsAiResponding(true);
        setCurrentOutputIndex(data.outputIndex);
        setCurrentAiResponse(prev => prev + data.delta);
      }
    };

    const handleTextDone = (data) => {
      setIsAiResponding(false);
      
      setMessages(prev => {
        const updated = [...prev];
        const aiMessageIndex = updated.findIndex(
          msg => msg.type === "ai" && msg.outputIndex === data.output_index
        );

        if (aiMessageIndex >= 0) {
          // 이미 존재 -> 이어붙임
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

    //제안 질문들
    const handleSuggestedQuestions = (data) => {
      if (data.questions) {
        setSuggestedQuestions(data.questions);
      }
    };

    //동사무소 정보
    const handleOfficeInfo = (data) => {
      setOfficeInfo({ tel: data.tel, pos: data.pos });
    };

    const handleError = (data) => {
      console.error('서버 에러:', data);
      alert(`오류가 발생했습니다: ${data.message}`);
    };

    // 핸들러 등록
    webSocketService.on('openai:conversation', 'input_audio_transcript.done', handleUserVoiceComplete);
    webSocketService.on('openai:conversation', 'response.audio_transcript.delta', handleTextResponse);
    webSocketService.on('openai:conversation', 'response.done', handleTextDone);
    webSocketService.on('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
    webSocketService.on('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
    webSocketService.on('openai:error', handleError);

    return () => {
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
        {messages.map((message, index) => (
          message.type === 'user' ? (
            <UserBubble key={index} text={message.content} />
          ) : (
            <SonjuBubble key={index} text={message.content} />
          )
        ))}

        {officeInfo?.pos && !showCall && (
          <Place communityCenter="가까운 동사무소" position={officeInfo.pos} />
        )}

        {showCall && (
          officeInfo?.tel
            ? <Call communityCenter="가까운 동사무소" number={officeInfo.tel} />
            : <SonjuBubble text="전화번호를 조회하고 있어요…" />
        )}

        {suggestedQuestions.length > 0 && (
          <div className="px-6">
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