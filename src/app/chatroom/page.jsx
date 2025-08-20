import { useState } from "react";
import ChatRoom from "../../components/chatroom/chatroom";
import BottomNav from "../../components/main/BottomNav";
import Header from "../../components/main/Header";

export default function ChatRoomPage() {
  const [isListening, setIsListening] = useState(false);
  const [voiceStarted, setVoiceStarted] = useState(0); // 🔥 숫자로 변경하여 변화 감지
  const [voiceStopped, setVoiceStopped] = useState(0); // 🔥 숫자로 변경하여 변화 감지

  const handleChatRoomVoiceStart = () => {
    console.log('ChatRoomPage: 음성 인식 시작');
    setIsListening(true);
    setVoiceStarted(prev => prev + 1); // 🔥 값 변경으로 ChatRoom에 신호 전달
  };

  const handleChatRoomVoiceStop = () => {
    console.log('ChatRoomPage: 음성 인식 중지');
    setIsListening(false);
    setVoiceStopped(prev => prev + 1); // 🔥 값 변경으로 ChatRoom에 신호 전달
  };

  const handleRecognitionComplete = (finalText) => {
    setIsListening(false);
    setVoiceStopped(prev => prev + 1);
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-[430px]">
      <Header />
      
      <div className="flex-1 overflow-hidden w-full min-w-[430px]"
           style={{ scrollbarWidth: "none", msOverflowStyle: "none", marginTop: "-30px" }}>
        <style>
          {`
            ::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        <ChatRoom 
          voiceStarted={voiceStarted}
          voiceStopped={voiceStopped}
          onRecognitionComplete={handleRecognitionComplete}
        />
      </div>

      <BottomNav 
        isInChatRoom={true}
        onListeningStart={handleChatRoomVoiceStart}
        onListeningStop={handleChatRoomVoiceStop}
        currentStep={isListening ? 'listening' : 'intro'}
      />
    </div>
  );
}