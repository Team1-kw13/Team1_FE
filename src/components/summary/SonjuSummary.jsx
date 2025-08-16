import SunImg from "../../assets/images/sun.svg";

export default function SonjuSummary({ isLoading = true }) {
  return (
    <div className="flex flex-col w-full max-w-[430px]">
      <div className="flex justify-start items-start ml-[23px] mt-[11px] w-full">
        <img src={SunImg} alt="손주" className="w-[30px] h-[30px] mr-[10px]" />
          <div className="font-bold text-[20px] max-w-[280px] max-h-[164px]
                          bg-[linear-gradient(90deg,#666666_44.23%,#000000_100%)] bg-clip-text text-transparent">
            {isLoading 
            ? "잠시만 기다려 주세요! 손주가 지금까지 대화를 요약하고 있어요!" 
            : "AI 민원 요약을 완료했어요!"}
          </div>
      </div>
    </div>
  );
}
