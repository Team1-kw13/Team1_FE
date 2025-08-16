import { useEffect,useRef } from "react";

export default function PlaceMap({officeInfo}) {
    if(!officeInfo) return null; //데이터 없으면 렌더링 안함
    const {tel,pos}=officeInfo;

    {/*api연결시
  const {mapRef}=useRef(null);

    useEffect(()=>{
        if(!officeInfo) return; //데이터 없으면 렌더링 안함

        const {pos}=officeInfo;//위도,경도

        //카카오맵 생성
        const map=new window.kakao.maps.Map(mapRef.current,{
            center:new window.kakao.maps.LatLng(pos[0],pos[1]),
            level:3,
        });

        //마커 생성
        new window.kakao.maps.Marker({
            map,
            position:new window.kakaomaps.LatLng(pos[0],pos[1]),
        });
    },[officeInfo]);
    */}

    return (
            <div 
                //ref={mapRef}
                className="w-[124px] h-[124px] rounded-[20px] border-[1px] border-black cursor-pointer">
                <div>{tel}</div>
                <div>{`위도:${pos[0]}`}</div>
                <div>{`경도:${pos[1]}`}</div>
            </div>
    );
}