import {useState,useEffect} from "react";
import PlaceMap from "./PlaceMap";
import Recommend from "../recommend/Recommend";

export default function Place({ communityCenter }) {
  /*좌표형태라면 어떤 맵에 꽂을 지는 프론트 선택
  const [officeInfo,setOfficeInfo]=useState(null);
  
  useEffect(()=>{
    const fetchOfficeInfo=async()=>{
      try{
        const res=await fetch("/api/office"); //api주소
        const data=await res.json();
        setOfficeInfo(data);
      } catch(err){
        console.error("API 호출 실패:",err);
      }
    }
    fetchOfficeInfo();
  },[]);
  */
 
  /*예비 지도*/
  const officeInfo={
    type:"officeInfo",
    tel:"02-1234-5678",
    pos:[37,127]
  };

  if(!officeInfo) return <div>불러오는중</div>

  return (
    <div className="flex flex-col">
        <div className="w-full h-full px-6">
            <div className="text-[24px] text-[#222222] font-bold"
                 style={{wordBreak:'keep-all'}}>
              사용자님의 위치에서<br /> 가장 가까운 동사무소는,<br />"{communityCenter}"입니다.</div>
            <div className="flex flex-row justify-start gap-[30px] mt-[12px]">
                <PlaceMap officeInfo={officeInfo}/>        
                <PlaceMap />
            </div>
        </div>
        <Recommend text="가까운 동사무소 알려줘" />       
    </div>

  );
}
