import ChatRoom from "../../components/chatroom/chatroom";
import BottomNav from "../../components/main/BottomNav";
import Header from "../../components/main/Header";

export default function ChatRoomPage() {
  return (
    <div className="flex flex-col h-screen w-full max-w-[430px]">
      <div className="fixed top-0 w-full max-w-[430px] z-20">
        <Header />
      </div>
      
      <div className="flex-1 overflow-hidden relative z-30
                      mt-[89.37px] mb-[130px] w-full min-w-[430px]"
           style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <style>
          {`
            ::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        <ChatRoom />
      </div>

      <div className="fixed bottom-0 w-full max-w-[430px] bottom-nav">
        <BottomNav />
      </div>
    </div>
  )
}