import Call from "./call/CallGuide";
import Place from "./place/PlaceGuide";
import Recommend from "./recommend/Recommend";
import SonjuBubble from "./SonjuBubble";
import SonjuListening from "./SonjuListening";
import UserBubble from "./UserBubble";

export default function ChatRoom() {
  return (
    <div className="flex flex-col rounded-tl-[30px] rounded-tr-[30px] w-full absolute top-[90px] pt-[25px]"
      style={{ boxShadow: "0 4px 10px 0px rgba(0, 0, 0, 0.15)" }}>
      <div className="flex items-center justify-center">
        <div className="font-small font-light text-[13px] text-gray-400">AI가 생성한 응답입니다. 중요한 정보는 꼭 확인해주세요.</div>
      </div>
      <UserBubble text="우왕 성공이다. 이거 컴포넌트 설정해놔서 알아서 늘어났다가 줄어들었다가 함 루룰" />
      <UserBubble text="등본 떼줘" />
      <UserBubble text="..." />
      <SonjuBubble/>
      <Recommend text="가까운 동사무소 알려줘" />
      <SonjuListening />
      <Place communityCenter="중계1동 주민센터" />
      <Call communityCenter="중계1동 주민센터" number="02-131-2340" />
    </div>
  );
}