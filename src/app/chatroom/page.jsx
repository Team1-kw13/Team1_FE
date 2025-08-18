import ChatRoom from "../../components/chatroom/chatroom";
import BottomNav from "../../components/main/BottomNav";
import Header from "../../components/main/Header";

export default function ChatRoomPage() {
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
        <ChatRoom />
      </div>

      <BottomNav />
    </div>
  )
}