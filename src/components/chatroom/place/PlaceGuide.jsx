import PlaceMap from "./PlaceMap";
import Recommend from "../recommend/Recommend";

export default function Place({ communityCenter }) {
  return (
    <div className="flex flex-col">
        <div className="w-full h-full px-6">
            <div className="text-[24px] text-[#222222] font-bold">사용자님의 위치에서<br /> 가장 가까운 동사무소는,<br />"{communityCenter}"입니다.</div>
            <div className="flex flex-row justify-start gap-[30px] mt-[12px]">
                <PlaceMap />        
                <PlaceMap />
            </div>
        </div>
        <Recommend text="가까운 동사무소 알려줘" />       
    </div>

  );
}
