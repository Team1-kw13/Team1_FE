import ChatRoom from "../../components/chatroom/chatroom";
import BottomNav from "../../components/main/BottomNav";
import Header from "../../components/main/Header";

export default function ChatRoomPage() {
  return (
    <div className="h-screen relative">
      <div className="fixed top-0 w-full max-w-[430px]">
        <Header />
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatRoom />
      </div>
      <div className="fixed bottom-0 w-full max-w-[430px] bottom-nav">
        <BottomNav />
      </div>
    </div>
  )
}