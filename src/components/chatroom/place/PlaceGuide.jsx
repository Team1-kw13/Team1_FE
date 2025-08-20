// PlaceGuide.jsx
import { useState, useEffect } from "react";
import PlaceMap from "./PlaceMap";
import Recommend from "../recommend/Recommend";

export default function Place({ communityCenter }) {
  const [officeInfo, setOfficeInfo] = useState(null);

  useEffect(() => {
    // ✅ 소켓 기다리지 말고 지도 테스트용 더미 주입
    setOfficeInfo({ tel: "02-1234-5678", pos: [37.5665, 126.9780] }); // 서울시청
  }, []);

  if (!officeInfo) return <div>불러오는중..</div>;

  return (
    <div className="flex flex-col">
      <div className="w-full h-full px-6">
        <div className="text-[24px] text-[#2222222] font-bold" style={{wordBreak:'keep-all'}}>
          사용자님의 위치에서<br /> 가장 가까운 동사무소는,<br />"{communityCenter}"입니다.
        </div>
        <div className="flex flex-row justify-start gap-[30px] mt-[12px]">
          <PlaceMap officeInfo={officeInfo}/>
        </div>
      </div>
      <Recommend text="가까운 동사무소 알려줘" />
    </div>
  );
}
