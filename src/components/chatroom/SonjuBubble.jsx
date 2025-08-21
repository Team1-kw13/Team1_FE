import { useEffect, useState } from "react";
import SunImg from "../../assets/images/sun.svg";
import SonjuAnswer from "./SonjuAnswer";

export default function SonjuBubble({ text }) {
  const [isLoading, setIsLoading] = useState(false); //답변 생성 상태
  const [answer, setAnswer] = useState(""); //AI 답변 저장

  useEffect (()=> {
    //AI API 호출 로직 실행
    if (text) {
      setAnswer(text);
      setIsLoading(false);
    }
    else {
    //예시로 2초 후에 답변을 설정
    setTimeout(() => {
      setAnswer("어쩌고 저쩌고 절차를 소개할게요. 어쩌고 저쩌고 어쩌고 저쩌고 입니다. 어쩌고 하는데 어쩌고 하는데. 어쩌고 구청 키오스크 이용하면 됨. 준비물은 뭐만 필요함 ㅇ러ㅣ나허ㅣ아ㅓ힌 ㅏㅓ히ㅏ어히나ㅓㅣ허니하ㅓㅣㅇ허니허ㅣ어ㅣ러이허ㅣ나히ㅣㄴ허ㅣ너ㅣ허니아힌허");
      setIsLoading(true);
    }, 2000);
    }
  }, [text]);

  return (
    <div className="flex flex-col pb-[24px]">
      <div className="flex justify-start items-center ml-[23px] mt-[11px]">
        <img src={SunImg} alt="손주" className="w-[30px] h-[30px] mr-[10px]" />
        <div className={`font-bold text-[20px] gap-[10px] max-w-[280px] max-h-[164px]
                        bg-gradient-to-r from-[#666666] to-[#000000] bg-clip-text text-transparent bg-[length:200%_200%] animate-gradient`}
             style={{animationDelay: '800ms'}}>
          {isLoading ? "잠시만 기다려 주세요!" : "손주가 알려드릴게요!"}
        </div>
      </div>
      
      {!isLoading && <SonjuAnswer text={answer} />}
    </div>
  );
}