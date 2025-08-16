import SonjuBubble from "../chatroom/SonjuBubble";
import UserBubble from "../chatroom/UserBubble";
import SonjuSummary from "./SonjuSummary";

export default function Summary() {
  return (
    <div className="flex flex-col rounded-tl-[30px] rounded-tr-[30px] w-full max-w-[430px] h-full relative z-30 bg-gray100"
         style={{ boxShadow: "0 4px 10px 0px rgba(0, 0, 0, 0.15)" }}>
      <div className="flex-shrink-0 flex items-center justify-center pt-[25px] w-full">
        <div className="font-small font-light text-[13px] text-gray400 pb-[27px]">AI가 생성한 응답입니다. 중요한 정보는 꼭 확인해주세요.</div>
      </div>
      <div className="flex-1 overflow-y-auto pb-[90px] w-full max-w-[430px] relative">
        <UserBubble text="민원 내용 요약" />
        <SonjuSummary />
      </div>
    </div>
  );
}