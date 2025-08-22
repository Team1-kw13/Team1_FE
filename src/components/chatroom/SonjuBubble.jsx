import { useEffect, useState } from "react";
import SunImg from "../../assets/images/sun.svg";
import SonjuAnswer from "./SonjuAnswer";

export default function SonjuBubble({ text, isTyping = false, outputIndex }) {
  const [isLoading, setIsLoading] = useState(false); //답변 생성 상태
  const [answer, setAnswer] = useState(""); //AI 답변 저장
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  useEffect (()=> {
    //AI API 호출 로직 실행
    if (text) {
      setAnswer(text);
      setIsLoading(false);

      if (!isTyping) {
        setIsTypingComplete(true);
      }
    }
    else {
    setIsLoading(true);
    setIsTypingComplete(true);
    }
  }, [text, isTyping]);

  const handleTypingComplete = () => {
    setIsTypingComplete(true);
  };

  return (
    <div className="flex flex-col pb-[24px]" data-output-index ={outputIndex}>
      <div className="flex justify-start items-center ml-[23px] mt-[11px]">
        <img src={SunImg} alt="손주" className="w-[30px] h-[30px] mr-[10px]" />
        <div className={`font-bold text-[20px] gap-[10px] max-w-[280px] max-h-[164px]
                        bg-gradient-to-r from-[#666666] to-[#000000] bg-clip-text text-transparent bg-[length:200%_200%] animate-gradient`}
             style={{animationDelay: '800ms'}}>
          {isLoading ? "잠시만 기다려 주세요!" : "손주가 알려드릴게요!"}
        </div>
      </div>
      
      {!isLoading && <SonjuAnswer text={answer} onTypingComplete={handleTypingComplete} isTyping={isTyping}/>}
    </div>
  );
}