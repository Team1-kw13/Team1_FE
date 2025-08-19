import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ChatRoom from "../../components/chatroom/chatroom";
import BottomNav from "../../components/main/BottomNav";
import Header from "../../components/main/Header";

export default function ChatRoomPage() {
  const location = useLocation();

  useEffect(() => {
    if (location.state?.userMessage) {
      const userMessage = location.state.userMessage;
      console.log("사용자 음성 인식 결과:", userMessage);
    }
  }, [location.state]);

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
        <ChatRoom initialUserMessage={location.state?.userMessage} />
      </div>

      <BottomNav />
    </div>
  )
}