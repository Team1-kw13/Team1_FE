import Call from "./call/CallGuide";
import ChatSummary from "./chat_summary";
import Place from "./place/PlaceGuide";
import Recommend from "./recommend/Recommend";
import SonjuBubble from "./SonjuBubble";
import SonjuListening from "./SonjuListening";
import UserBubble from "./UserBubble";

export default function ChatRoom() {
  return (
    <div className="flex flex-col rounded-tl-[30px] rounded-tr-[30px] w-full h-full relative z-30 bg-gray100"
         style={{ boxShadow: "0 4px 10px 0px rgba(0, 0, 0, 0.15)" }}>
      <div className="flex-shrink-0 flex items-center justify-center pt-[25px]">
        <div className="font-small font-light text-[13px] text-gray400 pb-[27px]">AI가 생성한 응답입니다. 중요한 정보는 꼭 확인해주세요.</div>
      </div>
      <div className="flex-1 overflow-y-auto pb-[90px]">
        <UserBubble text="우왕 성공이다. 이거 컴포넌트 설정해놔서 알아서 늘어났다가 줄어들었다가 함 루룰" />
        <UserBubble text="등본 떼줘" />
        <UserBubble text="..." />
        <UserBubble text="컴포넌트 제작 중임다~" />
        <SonjuBubble/>
        <Recommend text="등본 발급 시 준비물은 뭐야?" />
        <Recommend text="영업 시간 알려줘" />
        <Recommend text="전화번호 알려줘" />
        <SonjuListening />
        <Place communityCenter="중계1동 주민센터" />
        <Call communityCenter="중계1동 주민센터" number="02-131-2340" />
        <ChatSummary />
      </div>
    </div>
  );
}