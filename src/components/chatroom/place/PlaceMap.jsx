import { useEffect, useRef } from "react";

export default function PlaceMap({ officeInfo }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!officeInfo) return;

    const waitForSDK = () => {
      if (!window.kakao || !window.kakao.maps?.load) {
        setTimeout(waitForSDK, 50); // SDK 로드될 때까지 대기
        return;
      }
      window.kakao.maps.load(() => {
        const [lat, lng] = officeInfo.pos.map(Number);
        if (isNaN(lat) || isNaN(lng)) return; // 좌표가 비정상이면 렌더 생략
        const center = new window.kakao.maps.LatLng(lat, lng);
        const map = new window.kakao.maps.Map(ref.current, { center, level: 3 });
        new window.kakao.maps.Marker({ map, position: center });
        setTimeout(() => { map.relayout(); map.setCenter(center); }, 0);
      });
    };
    waitForSDK();
  }, [officeInfo]);

  return <div ref={ref} className="w-[124px] h-[124px] rounded-[20px] border-[1px] border-black cursor-pointer mb-[24px]" />;
}
