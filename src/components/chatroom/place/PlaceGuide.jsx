// src/components/chatroom/place/PlaceGuide.jsx
import { useEffect, useRef, useState } from "react";
import PlaceMap from "./PlaceMap";
import Recommend from "../recommend/Recommend";
import webSocketService from "../../../service/websocketService";

export default function Place({ communityCenter }) {
  const [officeInfo, setOfficeInfo] = useState(null);
  const inited = useRef(false);

  useEffect(() => {
    const onOffice = (msg) => {
      console.log("officeInfo 수신:", msg);
      setOfficeInfo({ tel: msg.tel, pos: msg.pos });
    };

    // 1) type-only (원래대로)
    webSocketService.on("officeInfo", onOffice);

    // 2) 채널이 "sonju:officeInfo"로 오는 특수 케이스 대응
    //    (handleMessage가 만드는 키와 동일하게 맞춰줌)
    webSocketService.on("sonju:officeInfo", "officeInfo", onOffice); // exact
    webSocketService.on("sonju:officeInfo", "*", onOffice);          // wildcard

    return () => {
      webSocketService.off("officeInfo", onOffice);
      webSocketService.off("sonju:officeInfo", "officeInfo", onOffice);
      webSocketService.off("sonju:officeInfo", "*", onOffice);
    };
  }, []);


  if (!officeInfo) return <div>불러오는중..</div>;

  return (
    <div className="flex flex-col">
      <div className="w-full h-full px-6">
        <div className="text-[24px] text-[#2222222] font-bold" style={{wordBreak:'keep-all'}}>
          사용자님의 위치에서<br /> 가장 가까운 동사무소는,<br />"{communityCenter}"입니다.
        </div>
        <div className="flex flex-row justify-start gap-[30px] mt-[12px]">
          <PlaceMap officeInfo={officeInfo} />
        </div>
      </div>
      <Recommend text="가까운 동사무소 알려줘" />
    </div>
  );
}
