import { useState, useEffect } from "react";
import SunImg from "../../assets/images/sun.svg";

export default function SonjuSummary() {
  const [isLoading, setIsLoading] = useState(true); //답변 생성 상태

  useEffect (()=> {
    //AI API 호출 로직 실행
    //예시로 2초 후에 답변을 설정
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);

  return (
    <div className="flex flex-col w-full max-w-[430px]">
      <div className="flex justify-start items-start ml-[23px] mt-[11px] w-full">
        <img src={SunImg} alt="손주" className="w-[30px] h-[30px] mr-[10px]" />
          <div className="font-bold text-[20px] max-w-[280px] max-h-[164px]
                          bg-[linear-gradient(90deg,#666666_44.23%,#000000_100%)] bg-clip-text text-transparent">
            {isLoading ? "잠시만 기다려 주세요! 손주가 지금까지 대화를 요약하고 있어요!" : "AI 민원 요약을 완료했어요!"}
          </div>
      </div>
      <div className="w-[385px] h-[180px]">
        {/*이미지 요약*/}
      </div>
      <div className="flex flex-row justify-between mx-[25.25px] mt-[12px]">
        <button className="w-[176px] h-[66px] bg-gray200 font-bold text-[22px] px-[46px] py-[16.5px] rounded-[10px] gap-[10px]">다시하기</button>
        <button className="w-[176px] h-[66px] bg-yellow font-bold text-[22px] text-white px-[46px] py-[16.5px] rounded-[10px] gap-[10px]">저장하기</button>
      </div>
    </div>
  );
}
