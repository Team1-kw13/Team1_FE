import {useState,useEffect} from "react";
import PlaceMap from "./PlaceMap";
import Recommend from "../recommend/Recommend";
import webSocketService from "../../../service/websocketService";

export default function Place({ communityCenter }) {
  const [officeInfo,setOfficeInfo]=useState(null);
  
  useEffect(()=>{
      const handleOfficeInfo=(data)=>{
        console.log("officeInfo 수신:",data);
        setOfficeInfo(data);
      }
      //서버에서 오는 officeInfo
    webSocketService.on("officeInfo",handleOfficeInfo);

    return()=>{
      webSocketService.off("officeInfo",handleOfficeInfo);
    }
  },[]);

  if(!officeInfo) return <div>불러오는중..</div>

  return (
    <div className="flex flex-col">
        <div className="w-full h-full px-6">
            <div className="text-[24px] text-[#222222] font-bold"
                 style={{wordBreak:'keep-all'}}>
              사용자님의 위치에서<br /> 가장 가까운 동사무소는,<br />"{communityCenter}"입니다.</div>
            <div className="flex flex-row justify-start gap-[30px] mt-[12px]">
                <PlaceMap officeInfo={officeInfo}/>
            </div>
        </div>
        <Recommend text="가까운 동사무소 알려줘" />       
    </div>

  );
}
