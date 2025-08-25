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

export default function ChatRoom({ voiceStarted, voiceStopped, onRecognitionComplete }) {
  // ===== 핵심 상태: output_index 기반 대화 관리 =====
  const [conversations, setConversations] = useState(new Map());
  // 🔧 수정: output_index를 서버에서 받은 값으로 관리
  const [pendingInitialMessage, setPendingInitialMessage] = useState(null);
  
  // ===== 현재 진행 상태 =====
  const [isListening, setIsListening] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [currentUserTranscript, setCurrentUserTranscript] = useState('');
  
  // ===== UI 표시용 상태 =====
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [showSuggestionsForIndex, setShowSuggestionsForIndex] = useState(null);
  
  // ===== 특수 기능 상태 =====
  const [officeInfo, setOfficeInfo] = useState(null);
  const [showPlaceForIndex, setShowPlaceForIndex] = useState(null);
  const [showCallForIndex, setShowCallForIndex] = useState(null);
  
  // ===== 기존 props/params =====
  const { initialMessage } = useParams();
  const location = useLocation();
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);

  // ===== 대화 관리 헬퍼 함수들 =====
  
  /**
   * 🔧 수정: 서버 응답을 받을 때 대화를 생성하거나 업데이트
   */
  const ensureConversationExists = (outputIndex, userMessage = null) => {
    setConversations(prev => {
      const updated = new Map(prev);
      
      if (!updated.has(outputIndex)) {
        // 새로운 대화 생성
        const newConversation = {
          id: Date.now(),
          outputIndex: outputIndex,
          userMessage: userMessage || '처리 중...',
          userMessageComplete: userMessage ? true : false,
          aiMessage: '',
          aiTextComplete: false,
          aiAudioComplete: false,
          timestamp: new Date(),
        };
        
        updated.set(outputIndex, newConversation);
        console.log(`새 대화 생성: output_index=${outputIndex}, message="${userMessage}"`);
      }
      
      return updated;
    });
    
    return outputIndex;
  };

  /**
   * 사용자 메시지 업데이트
   */
  const updateUserMessage = (outputIndex, transcript) => {
    ensureConversationExists(outputIndex);
    
    setConversations(prev => {
      const updated = new Map(prev);
      const conversation = updated.get(outputIndex);
      if (conversation) {
        updated.set(outputIndex, {
          ...conversation,
          userMessage: transcript,
          userMessageComplete: false,
        });
      }
      return updated;
    });
  };

  /**
   * 사용자 메시지 완료 처리
   */
  const completeUserMessage = (outputIndex, finalTranscript) => {
    ensureConversationExists(outputIndex, finalTranscript);
    
    setConversations(prev => {
      const updated = new Map(prev);
      const conversation = updated.get(outputIndex);
      if (conversation) {
        updated.set(outputIndex, {
          ...conversation,
          userMessage: finalTranscript,
          userMessageComplete: true,
        });
      }
      return updated;
    });
    console.log(`사용자 메시지 완료: output_index=${outputIndex}, message="${finalTranscript}"`);
  };

  /**
   * AI 메시지 업데이트 (실시간)
   */
  const updateAiMessage = (outputIndex, deltaText) => {
    ensureConversationExists(outputIndex);
    
    setConversations(prev => {
      const updated = new Map(prev);
      const conversation = updated.get(outputIndex);
      if (conversation) {
        updated.set(outputIndex, {
          ...conversation,
          aiMessage: (conversation.aiMessage || '') + deltaText,
        });
      }
      return updated;
    });
  };

  /**
   * AI 응답 완료 처리
   */
  const completeAiResponse = (outputIndex, responseType) => {
    setConversations(prev => {
      const updated = new Map(prev);
      const conversation = updated.get(outputIndex);
      if (conversation) {
        const updatedConversation = { ...conversation };
        
        if (responseType === 'text') {
          updatedConversation.aiTextComplete = true;
        } else if (responseType === 'audio') {
          updatedConversation.aiAudioComplete = true;
        } else if (responseType === 'audio_transcript') {
          updatedConversation.aiTextComplete = true;
        }
        
        updated.set(outputIndex, updatedConversation);
      }
      return updated;
    });
    
    console.log(`AI 응답 완료: output_index=${outputIndex}, type=${responseType}`);
    
    // 🔧 수정: 중복 요청 방지
    const conversation = conversations.get(outputIndex);
    if (conversation && (conversation.aiTextComplete || responseType === 'text' || responseType === 'audio_transcript')) {
      if (showSuggestionsForIndex !== outputIndex) {
        setShowSuggestionsForIndex(outputIndex);
        
        // 🔧 수정: 타임아웃 시간 증가 및 중복 방지
        setTimeout(() => {
          if (webSocketService.isConnected && !isAiResponding) {
            console.log(`추천 질문 요청: output_index=${outputIndex}`);
            webSocketService.send('sonju:suggestedQuestion', 'suggestion.response', {
              output_index: outputIndex
            });
          }
        }, 2000); // 2초로 증가
      }
    }
  };

  /**
   * 키워드 기반으로 전화 관련 쿼리인지 판단  
   */
  const isCallRelatedQuery = (message) => {
    const callKeywords = ['전화', '전화번호', '연락처', '번호', '전화해', '전화걸어', '통화', '상담', '문의', '연락'];
    return callKeywords.some(keyword => message.includes(keyword));
  };

  /**
   * 동사무소 정보 처리
   */
  const processOfficeInfo = (data, outputIndex) => {
    console.log('동사무소 정보 처리:', data);
    
    setOfficeInfo({
      tel: data.tel,
      position: data.pos || data.position
    });

    const conversation = conversations.get(outputIndex);
    if (!conversation) return;

    const userMessage = conversation.userMessage;
    
    if (isCallRelatedQuery(userMessage)) {
      setShowCallForIndex(outputIndex);
    } else {
      setShowPlaceForIndex(outputIndex);
    }
  };

  /**
   * 대화 목록을 output_index 순서로 정렬해서 반환
   */
  const getSortedConversations = () => {
    return Array.from(conversations.entries())
      .sort(([indexA], [indexB]) => indexA - indexB)
      .map(([index, conversation]) => conversation);
  };

  // ===== 초기화 로직 =====
  useEffect(() => {
    console.log('ChatRoom 컴포넌트 초기화');
    
    if (!webSocketService.isConnected) {
      webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
    }
  }, []);

  // ===== 음성 상태 처리 =====
  useEffect(() => {
    if (voiceStarted && !isListening) {
      console.log('[ChatRoom] 음성 인식 시작');
      setIsListening(true);
      setCurrentUserTranscript('');
      
      try {
        webSocketService.resumeAudioContextIfNeeded?.();
      } catch (error) {
        console.error('오디오 컨텍스트 활성화 실패:', error);
      }
    }
  }, [voiceStarted, isListening]);

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
      webSocketService.sendText(decodedMessage);
      // setTimeout(() => {
      //   if (webSocketService.isConnected) {
      //     webSocketService.sendText(decodedMessage);
      //   }
      // }, 500);
    }
  }, [voiceStopped, isListening]);

  // ===== 초기 메시지 처리 =====
  useEffect(() => {
    if (hasProcessedInitialMessage) return;
    
    let messageToProcess = null;
    
    if (initialMessage) {
      messageToProcess = decodeURIComponent(initialMessage);
    } else if (location.state?.transcript) {
      messageToProcess = location.state.transcript;
    }
    
    if (messageToProcess && !isAiResponding) {
      console.log('초기 메시지 처리:', messageToProcess);
      
      // 🔧 수정: 서버 응답을 기다려서 대화 생성
      setPendingInitialMessage(messageToProcess);
      setHasProcessedInitialMessage(true);
      
      setTimeout(() => {
        if (webSocketService.isConnected) {
          webSocketService.selectPrePrompt(messageToProcess);
        }
      }, 500);
    }
  }, [initialMessage, location.state, hasProcessedInitialMessage, isAiResponding]);

  // ===== WebSocket 핸들러 설정 =====
  useEffect(() => {
    if (!webSocketService.isConnected) {
      webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
    }

    // === 사용자 음성 → 텍스트 변환 실시간 (delta) ===
    const handleInputAudioTranscriptDelta = (data) => {
      console.log('사용자 음성 전사 delta:', data);
      if (data.delta && data.output_index !== undefined) {
        setCurrentUserTranscript(prev => prev + data.delta);
        updateUserMessage(data.output_index, currentUserTranscript + data.delta);
      }
    };

    // === 사용자 음성 → 텍스트 변환 완료 (done) ===
    const handleInputAudioTranscriptDone = (data) => {
      console.log('사용자 음성 전사 완료:', data);
      
      if (data.output_index !== undefined) {
        const finalTranscript = currentUserTranscript.trim();
        if (finalTranscript) {
          completeUserMessage(data.output_index, finalTranscript);
          onRecognitionComplete?.(finalTranscript);
        }
      }
      
      setCurrentUserTranscript('');
      setIsListening(false);
    };

    // === AI 텍스트 응답 실시간 (delta) ===
    const handleResponseTextDelta = (data) => {
      console.log('AI 텍스트 응답 delta:', data);
      if (data.delta && data.output_index !== undefined) {
        setIsAiResponding(true);
        
        // 🔧 수정: pending 메시지가 있다면 대화 생성
        if (pendingInitialMessage && !conversations.has(data.output_index)) {
          ensureConversationExists(data.output_index, pendingInitialMessage);
          setPendingInitialMessage(null);
        }
        
        updateAiMessage(data.output_index, data.delta);
      }
    };

    // === AI 음성 동기화 텍스트 (audio_transcript.delta) ===
    const handleResponseAudioTranscriptDelta = (data) => {
      console.log('AI 음성 동기화 텍스트 delta:', data);
      if (data.delta && data.output_index !== undefined) {
        setIsAiResponding(true);
        
        // 🔧 수정: pending 메시지가 있다면 대화 생성
        if (pendingInitialMessage && !conversations.has(data.output_index)) {
          ensureConversationExists(data.output_index, pendingInitialMessage);
          setPendingInitialMessage(null);
        }
        
        updateAiMessage(data.output_index, data.delta);
      }
    };

    // === AI 텍스트 응답 완료 (done) ===
    const handleResponseTextDone = (data) => {
      console.log('AI 텍스트 응답 완료:', data);
      if (data.output_index !== undefined) {
        completeAiResponse(data.output_index, 'text');
        setIsAiResponding(false);
      }
    };

    // === AI 음성 응답 완료 (done) ===
    const handleResponseAudioDone = (data) => {
      console.log('AI 음성 응답 완료:', data);
      if (data.output_index !== undefined) {
        completeAiResponse(data.output_index, 'audio');
      }
    };

    // === AI 음성 동기화 텍스트 완료 (audio_transcript.done) ===
    const handleResponseAudioTranscriptDone = (data) => {
      console.log('AI 음성 동기화 텍스트 완료:', data);
      if (data.output_index !== undefined) {
        completeAiResponse(data.output_index, 'audio_transcript');
        setIsAiResponding(false);
      }
    };

    // === 추천 질문 수신 ===
    const handleSuggestedQuestions = (data) => {
      console.log('제안 질문들:', data);
      if (data.questions && Array.isArray(data.questions)) {
        setSuggestedQuestions(data.questions);
      }
    };

    // === 동사무소 정보 수신 ===
    const handleOfficeInfo = (data) => {
      console.log('동사무소 정보 수신:', data);
      
      if (data.output_index !== undefined) {
        processOfficeInfo(data, data.output_index);
      } else {
        const sortedConversations = getSortedConversations();
        if (sortedConversations.length > 0) {
          const lastConversation = sortedConversations[sortedConversations.length - 1];
          processOfficeInfo(data, lastConversation.outputIndex);
        }
      }
    };

    // === 에러 처리 ===
    const handleError = (data) => {
      console.error('서버 에러:', data);
      setIsAiResponding(false);
      setIsListening(false);
    };

    // === 전화 의도 감지 (전역 이벤트) ===
    const handleCallIntent = (e) => {
      const transcript = e?.detail || '전화번호 알려줘';
      console.log('전화 의도 감지:', transcript);
      
      setPendingInitialMessage(transcript);
      
      setTimeout(() => {
        if (webSocketService.isConnected) {
          webSocketService.sendText(transcript);
        }
      }, 100);
    };

    // 핸들러 등록
    webSocketService.on('openai:conversation', 'input_audio_transcript.delta', handleInputAudioTranscriptDelta);
    webSocketService.on('openai:conversation', 'input_audio_transcript.done', handleInputAudioTranscriptDone);
    webSocketService.on('openai:conversation', 'response.text.delta', handleResponseTextDelta);
    webSocketService.on('openai:conversation', 'response.text.done', handleResponseTextDone);
    webSocketService.on('openai:conversation', 'response.audio.done', handleResponseAudioDone);
    webSocketService.on('openai:conversation', 'response.audio_transcript.delta', handleResponseAudioTranscriptDelta);
    webSocketService.on('openai:conversation', 'response.audio_transcript.done', handleResponseAudioTranscriptDone);
    webSocketService.on('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
    webSocketService.on('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
    webSocketService.on('openai:error', handleError);
    
    window.addEventListener('sonju:call_intent', handleCallIntent);

    return () => {
      webSocketService.off('openai:conversation', 'input_audio_transcript.delta', handleInputAudioTranscriptDelta);
      webSocketService.off('openai:conversation', 'input_audio_transcript.done', handleInputAudioTranscriptDone);
      webSocketService.off('openai:conversation', 'response.text.delta', handleResponseTextDelta);
      webSocketService.off('openai:conversation', 'response.text.done', handleResponseTextDone);
      webSocketService.off('openai:conversation', 'response.audio.done', handleResponseAudioDone);
      webSocketService.off('openai:conversation', 'response.audio_transcript.delta', handleResponseAudioTranscriptDelta);
      webSocketService.off('openai:conversation', 'response.audio_transcript.done', handleResponseAudioTranscriptDone);
      webSocketService.off('sonju:suggestedQuestion', 'suggestion.response', handleSuggestedQuestions);
      webSocketService.off('sonju:officeInfo', 'officeInfo', handleOfficeInfo);
      webSocketService.off('openai:error', handleError);
      
      window.removeEventListener('sonju:call_intent', handleCallIntent);
    };
  }, []); // 🔧 수정: conversations 의존성 제거

  // 추천 질문 클릭 처리
  const handleQuestionClick = (question) => {
    if (isAiResponding) return;

    setPendingInitialMessage(question);
    setShowSuggestionsForIndex(null);
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
        {getSortedConversations().map((conversation) => (
          <div key={`conversation-${conversation.id}`} className="conversation-block">
            <UserBubble 
              text={conversation.userMessage} 
              isTemp={!conversation.userMessageComplete}
            />
            
            {conversation.aiMessage && (
              <SonjuBubble 
                text={conversation.aiMessage} 
                outputIndex={conversation.outputIndex}
                isTyping={!conversation.aiTextComplete}
              />
            )}
            
            {showSuggestionsForIndex === conversation.outputIndex && suggestedQuestions.length > 0 && (
              <div className="mt-[20px] px-6">
                <div className="font-bold text-[#000000] text-[22px] mb-4">
                  다음 대화는 어떠세요?
                </div>
                <div className="flex gap-2 justify-between items-center">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={`question-${conversation.outputIndex}-${index}`}
                      onClick={() => handleQuestionClick(question)}
                      className="p-3 text-left font-bold text-[22px] text-gray500 bg-gray200 rounded-[10px] cursor-pointer hover:bg-gray300 w-[176px]"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {showPlaceForIndex === conversation.outputIndex && officeInfo && (
              <Place 
                key={`place-${conversation.outputIndex}`}
                communityCenter="가까운 동사무소" 
                phoneNumber={officeInfo.tel}
                position={officeInfo.position}
              />
            )}
            
            {showCallForIndex === conversation.outputIndex && officeInfo && (
              <Call 
                key={`call-${conversation.outputIndex}`}
                communityCenter="가까운 동사무소" 
                number={officeInfo.tel} 
              />
            )}
          </div>
        ))}
        
        {getSortedConversations().filter(conv => conv.aiTextComplete && !conv.hasError).length >= 3 && (
          <ChatSummary />
        )}
      </div>
      
      {isListening && (
        <div className="absolute bottom-0 w-full flex justify-center z-40">
          <SonjuListening />
        </div>
      )}
    </div>
  );
}