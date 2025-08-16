import { useState, useEffect } from "react";
import SonjuBubble from "../chatroom/SonjuBubble";
import UserBubble from "../chatroom/UserBubble";
import SonjuSummary from "./SonjuSummary";
import webSocketService from "../../service/websocketService";
//import { data } from "react-router-dom";

export default function Summary() {
  const [summaryImage, setSummaryImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!webSocketService.isConnected) {
      webSocketService.connect(import.meta.env.VITE_WEBSOCKET_URL);
    }

    const handleSummaryImage = (data) => {
      if (data.image_base64) {
        setSummaryImage(`data:image/png;base64,${data.image_base64}`);
      } else if (data.image_url) {
        setSummaryImage(data.image_url);
      }

      setIsLoading(false);
    };

    const handleError = (data) => {
      setIsLoading(false);
      alert(`요약 생성 중 오류가 발생했습니다: ${data.error}`); //확인 필요!!!!!!!
    };

    //핸들러 등록
    webSocketService.on('sonju:summarize', 'summary.image', handleSummaryImage);
    webSocketService.on('openai:error', handleError);

    return () => {
      webSocketService.off('sonju:summarize', 'summary.image', handleSummaryImage);
      webSocketService.off('openai:error', handleError);
    };
  }, []);

  return (
    <div className="flex flex-col rounded-tl-[30px] rounded-tr-[30px] w-full max-w-[430px] h-full relative z-30 bg-gray100"
         style={{ boxShadow: "0 4px 10px 0px rgba(0, 0, 0, 0.15)" }}>
      <div className="flex-shrink-0 flex items-center justify-center pt-[25px] w-full">
        <div className="font-small font-light text-[13px] text-gray400 pb-[27px]">AI가 생성한 응답입니다. 중요한 정보는 꼭 확인해주세요.</div>
      </div>
      <div className="flex-1 overflow-y-auto pb-[90px] w-full max-w-[430px] relative">
        <UserBubble text="민원 내용 요약" />
        <SonjuSummary isLoading={isLoading} />
        {summaryImage && (<img src={summaryImage} alt="Summary" className="w-[385px] h-[180px]" />)}
        {/* 로딩 실패시 메시지 필요하면 여기에 !isLoading과 함께 제시 */} 
        <div className="flex flex-row justify-between mx-[25.25px] mt-[12px]">
          <button className="w-[176px] h-[66px] bg-gray200 font-bold text-[22px] px-[46px] py-[16.5px] rounded-[10px] gap-[10px]">다시하기</button>
          <button className="w-[176px] h-[66px] bg-yellow font-bold text-[22px] text-white px-[46px] py-[16.5px] rounded-[10px] gap-[10px]">저장하기</button>
        </div>
      </div>
    </div>
  );
}