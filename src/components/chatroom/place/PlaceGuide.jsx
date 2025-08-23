import PlaceMap from "./PlaceMap";
import Recommend from "../recommend/Recommend";
import { useMemo } from "react";

export default function Place({ communityCenter, phoneNumber, position }) {
  const officeInfo = useMemo(() => {
    if (!position || position.length < 2) return null;
    return { tel: phoneNumber, pos: position };
  }, [phoneNumber, position]);

  if (!officeInfo) return <div>불러오는중..</div>;

  return (
    <div className="flex flex-col">
      <div className="w-full h-full px-6">
        <div className="text-[24px] text-[#2222222] font-bold" style={{wordBreak:'keep-all'}}>
          
        </div>
        <div className="flex flex-row justify-start gap-[30px] mt-[12px]">
          <PlaceMap officeInfo={officeInfo} />
        </div>
      </div>
      {/*<Recommend text="가까운 동사무소 알려줘" />*/}
    </div>
  );
}
