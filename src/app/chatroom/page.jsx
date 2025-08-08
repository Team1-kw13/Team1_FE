import ChatRoom from "../../components/chatroom/chatroom";
import BottomNav from "../../components/main/BottomNav";
import Header from "../../components/main/Header";

export default function ChatRoomPage() {
  return (
    <div className="flex flex-col justify-between h-screen relative">
      <Header />
      <div className="flex-1 overflow-auto">
        <ChatRoom />
      </div>
      <BottomNav />
    </div>
  )
}