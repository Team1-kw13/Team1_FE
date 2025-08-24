import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import Call from "./call/CallGuide";
import ChatSummary from "./chat_summary";
import Place from "./place/PlaceGuide";
import Recommend from "./recommend/Recommend";
import SonjuBubble from "./SonjuBubble";
import SonjuListening from "./SonjuListening";
import UserBubble from "./UserBubble";
import webSocketService from "../../service/websocketService";


export default function ChatRoom({ voiceStarted, voiceStopped, onRecognitionComplete,transcriptFromPage }) {
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
  
  // 실시간 전사 상태
  const [currentUserTranscript, setCurrentUserTranscript] = useState('');
  
  // 대화 흐름 관리
  const [completedConversations, setCompletedConversations] = useState([]);
  const [showRecommendForIndex, setShowRecommendForIndex] = useState(null);
  const [showPlaceForIndex, setShowPlaceForIndex] = useState(null);
  const [showCallForIndex, setShowCallForIndex] = useState(null);
  const [shouldShowSummary, setShouldShowSummary] = useState(false);
  
  // 완성된 AI 응답을 저장하는 상태
  const [completedAiResponses, setCompletedAiResponses] = useState(new Map());
  const location = useLocation();

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
      setIsListening(false);
    }
  }, [voiceStopped]);

  // 부모에서 전달된 transcript 처리
  useEffect(() => {
    if (transcriptFromPage && transcriptFromPage.trim()) {
      console.log('[ChatRoom] 부모에서 전달받은 transcript:', transcriptFromPage);
      
      const conversation = {
        id: Date.now(),
        userMessage: transcriptFromPage,
        aiMessage: '',
        isComplete: false,
        timestamp: new Date()
      };

      setCompletedConversations(prev => [...prev, conversation]);
      setShowRecommendForIndex(null);

      // preprompt로 전송 -> 왜?????
      setTimeout(() => {
        if (webSocketService.isConnected) {
          webSocketService.selectPrePrompt(transcriptFromPage);
        }
      }, 100);
    }
  }, [transcriptFromPage]);

  // 초기 메시지 처리
  useEffect(() => {
    if (initialMessage && !hasInitMessage) {
      const decodedMessage = decodeURIComponent(initialMessage);
      console.log('초기 메세지:', decodedMessage);

      const conversation = {
        id: Date.now(),
        userMessage: decodedMessage,
        aiMessage: '',
        isComplete: false,
        timestamp: new Date()
      };

      setCompletedConversations(prev => [...prev, conversation]);
      setHasInitMessage(true);

      // preprompt로 전송
      setTimeout(() => {
        if (webSocketService.isConnected) {
          webSocketService.selectPrePrompt(decodedMessage);
        }
      }, 500);
    }
  }, [initialMessage, hasInitMessage]);

  // location.state에서 transcript 처리
  useEffect(() => {
    if (location.state?.transcript && !hasInitMessage) {
      const transcript = location.state.transcript;
      console.log('페이지에서 전달받은 transcript:', transcript);

      const conversation = {
        id: Date.now(),
        userMessage: transcript,
        aiMessage: '',
        isComplete: false,
        timestamp: new Date()
      };

      setCompletedConversations(prev => [...prev, conversation]);
      setHasInitMessage(true);

      // preprompt로 전송
      setTimeout(() => {
        if (webSocketService.isConnected) {
          webSocketService.selectPrePrompt(transcript);
        }
      }, 500);
    }
  }, [location.state, hasInitMessage]);

  // WebSocket 핸들러 설정 - 의존성 최소화
  useEffect(() => {
    if (!webSocketService.isConnected) {
      webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
    }
    
    // 사용자 음성 -> 텍스트 변환 실시간 (delta)
    const handleInputAudioTranscriptDelta = (data) => {
      console.log('사용자 음성 전사 delta:', data);
      if (data.delta) {
        setCurrentUserTranscript(prev => prev + data.delta);
      }
    };

    // 사용자 음성 -> 텍스트 변환 완료 (done)
    const handleInputAudioTranscriptDone = (data) => {
      console.log('사용자 음성 전사 완료:', data);
      
      setCurrentUserTranscript(currentTranscript => {
        const finalTranscript = currentTranscript.trim();
        if (finalTranscript) {
          const conversation = {
            id: Date.now(),
            userMessage: finalTranscript,
            aiMessage: '',
            isComplete: false,
            timestamp: new Date(),
            outputIndex: data.output_index
          };
          
          setCompletedConversations(prev => [...prev, conversation]);
          setShowRecommendForIndex(null);
          onRecognitionComplete?.(finalTranscript);
        }
        
        setIsListening(false);
        return '';
      });
    };

    // AI 텍스트 응답 실시간 (delta) - 올바른 핸들러
    const handleTextResponseDelta = (data) => {
      console.log('AI 텍스트 응답 delta:', data);
      if (data.delta) {
        setIsAiResponding(true);
        setCurrentOutputIndex(data.output_index);
        //setCurrentAiResponse(prev => prev + data.delta); //12:16 주석처리
        setCompletedConversations(prev =>
          prev.map(conv =>
            conv.outputIndex === data.output_index || (!conv.outputIndex && !conv.aiMessage)
            ? {
              ...conv,
              outputIndex: data.output_index,
              aiMessage: (conv.aiMessage ||'') + data.delta
            }
            : conv
          )
        )
      }
    };

    // AI 텍스트 응답 완료 (done)
    const handleTextResponseDone = (data) => {
      console.log('AI 텍스트 응답 완료:', data);
      
      setCompletedConversations(prev =>
        prev.map(conv => 
          conv.outputIndex === data.output_index
          ? {...conv, isComplete: true }
          : conv
        )
      );

      setShowRecommendForIndex(data.output_index);

      setTimeout(() => {
        webSocketService.send('sonju:suggestedQuestion','suggestion.response', {output_index: data.output_index})
      }, 1000);

      if (completedConversations.length >= 3 ) {
        setShouldShowSummary(true);
      }

      setCurrentOutputIndex(null);
      setIsAiResponding(false);
    };

    // AI 음성 데이터 수신 (delta) - base64로 인코딩된 오디오 데이터
    const handleAudioDelta = async (data) => {
      console.log('AI 오디오 데이터 수신:', data);
      try {
        if (data.delta) {
          // base64 디코딩 후 오디오 재생
          const audioData = atob(data.delta);
          const arrayBuffer = new ArrayBuffer(audioData.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          for (let i = 0; i < audioData.length; i++) {
            uint8Array[i] = audioData.charCodeAt(i);
          }
          await webSocketService.playAudioBuffer(arrayBuffer);
        }
      } catch (error) {
        console.error('AI 오디오 재생 실패:', error);
      }
    };

    // AI 오디오 재생 완료 (done)
    const handleAudioDone = (data) => {
      console.log('AI 오디오 재생 완료:', data);
    };

    // 제안 질문 수신
    const handleCallIntent = (transcript) => {
      setShowCall(true);
      const ask = transcript || '가까운 동사무소 전화번호 알려줘';
      setMessages(prev => [...prev, { type: 'user', content: ask, timestamp: new Date() }]);
      webSocketService.sendText(ask);
    };

    const handleSuggestedQuestions = (data) => {
      console.log('제안 질문들:', data);
      if (data.questions && Array.isArray(data.questions)) {
        setSuggestedQuestions(data.questions);
      }
    };

    // 동사무소 정보 수신
    const handleOfficeInfo = (data) => {
      console.log('동사무소 정보:', data);
      setOfficeInfo({
        tel: data.tel,
        position: data.pos
      });
      
      // 현재 대화에 대해 Place 표시
      setCompletedConversations(prevConvs => {
        if (prevConvs.length > 0) {
          const lastConv = prevConvs[prevConvs.length - 1];
          setShowPlaceForIndex(lastConv.outputIndex || lastConv.id);
        }
        return prevConvs;
      });
    };

    // 에러 처리
    const handleError = (data) => {
      console.error('서버 에러:', data);
      alert(`오류가 발생했습니다: ${data.message || data.error}`);
      setIsAiResponding(false);
    };

    // 핸들러 등록 - 올바른 이벤트 타입 사용
    webSocketService.on('openai:conversation', 'input_audio_transcript.delta', handleInputAudioTranscriptDelta);
    webSocketService.on('openai:conversation', 'input_audio_transcript.done', handleInputAudioTranscriptDone);
    webSocketService.on('openai:conversation', 'response.text.delta', handleTextResponseDelta); // 텍스트 응답
    webSocketService.on('openai:conversation', 'response.text.done', handleTextResponseDone);
    webSocketService.on('openai:conversation', 'response.audio.delta', handleAudioDelta); // 텍스트 응답
    webSocketService.on('openai:conversation', 'response.audio.done', handleAudioDone);
    webSocketService.on('openai:conversation','response.audio_transcript.delta',handleTextResponseDelta);
    webSocketService.on('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
    webSocketService.on('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
    webSocketService.on('openai:error', handleError);

    return () => {
      // 핸들러 제거
      webSocketService.off('openai:conversation', 'input_audio_transcript.delta', handleInputAudioTranscriptDelta);
      webSocketService.off('openai:conversation', 'input_audio_transcript.done', handleInputAudioTranscriptDone);
      webSocketService.off('openai:conversation', 'response.text.delta', handleTextResponseDelta);
      webSocketService.off('openai:conversation', 'response.text.done', handleTextResponseDone);
      webSocketService.off('openai:conversation', 'response.audio.delta', handleAudioDelta); // 텍스트 응답
      webSocketService.off('openai:conversation', 'response.audio.done', handleAudioDone);
      webSocketService.off('openai:conversation','response.audio_transcript.delta', handleTextResponseDelta);
      webSocketService.off('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
      webSocketService.off('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
      webSocketService.off('openai:error', handleError);
    };
  }, []); // 빈 의존성 배열

  // 추천 질문 클릭 처리
  const handleQuestionClick = (question) => {
    const conversation = {
      id: Date.now(),
      userMessage: question,
      aiMessage: '',
      isComplete: false,
      timestamp: new Date()
    };
    
    setCompletedConversations(prev => [...prev, conversation]);
    setShowRecommendForIndex(null);
    setSuggestedQuestions([]);

    // 서버에 전송
    setTimeout(() => {
      if (webSocketService.isConnected) {
        webSocketService.selectPrePrompt(question);
      }
    }, 100);
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
        {/* 완료된 대화들 표시 */}
        {completedConversations.map((conversation) => (
          <div key={`conversation-${conversation.id}`} className="conversation-block">
            {/* 사용자 메시지 */}
            <UserBubble text={conversation.userMessage} />
            
            {/* AI 메시지 - 완성된 응답만 표시 */}
            {conversation.aiMessage && (
              <SonjuBubble 
                text={conversation.aiMessage} 
                outputIndex={conversation.outputIndex}
                isTyping={false}
              />
            )}{
              /* 현재 진행 중인 사용자 음성 전사 */}
              {/* {currentUserTranscript && (
                <div className="conversation-block">
                  <UserBubble text={currentUserTranscript} />
                </div>
              )}
               */}
              
            
            {/* 해당 대화에 대한 제안 질문들 */}
            {showRecommendForIndex === (conversation.outputIndex || conversation.id) && 
             suggestedQuestions.length > 0 && (
              <div className="mt-[20px]">
                <div className="font-bold text-[#000000] text-[22px] mb-4 px-6">
                  다음 대화는 어떠세요?
                </div>
                <div className="flex flex-wrap gap-[16px] px-6">
                  {suggestedQuestions.map((question, index) => (
                    <Recommend 
                      key={`question-${conversation.id}-${index}`}
                      text={question}
                      type="question"
                      onClick={() => handleQuestionClick(question)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* 동사무소 위치 정보 */}
            {showPlaceForIndex === (conversation.outputIndex || conversation.id) && officeInfo && (
              <Place 
                key={`place-${conversation.id}`}
                communityCenter="가까운 동사무소" 
                phoneNumber={officeInfo.tel}
                position={officeInfo.position}
              />
            )}
            
            {/* 전화번호 정보 */}
            {showCallForIndex === (conversation.outputIndex || conversation.id) && officeInfo && (
              <Call 
                key={`call-${conversation.id}`}
                communityCenter="가까운 동사무소" 
                number={officeInfo.tel} 
              />
            )}
          </div>
        ))}
        
        {isAiResponding && (
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
            <div className="flex gap-2 justify-center items-center">
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

      {/* 사용자 음성 실시간 전사 표시 */}
      {/* {isListening && currentUserTranscript && (
        <div className="px-6 py-2 bg-gray200 text-gray600 text-sm">
          음성 인식 중: {currentUserTranscript}
        </div>
      )} */}
      
      {/* 음성 인식 중 표시 */}
      {isListening && (
        <div className="absolute bottom-0 w-full flex justify-center z-40">
          <SonjuListening />
        </div>
      )}
    </div>
  );
}