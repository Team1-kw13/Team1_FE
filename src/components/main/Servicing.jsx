import {useState,useEffect} from "react"
import Wave1 from "../../assets/images/Voice_Wave1.svg"
import Wave2 from "../../assets/images/Voice_Wave2.svg"
import Wave3 from "../../assets/images/Voice_Wave3.svg"
import Wave4 from "../../assets/images/Voice_Wave4.svg"
import Wave5 from "../../assets/images/Voice_Wave5.svg"

const waves=[Wave1,Wave2,Wave3,Wave4,Wave5];

export default function Servicing({isListening}){
    const [waveIndex,setWaveIndex]=useState(0);

    useEffect(()=>{
        let interval;
        if(isListening){
            interval=setInterval(()=>{
                setWaveIndex(Math.floor(Math.random()*waves.length));
            },300);
        }
        return()=>clearInterval(interval);
    },[isListening]);

    return (
        <div className="flex flex-col gap-[36px] items-center bg-gray100">
            {/* 인식된 텍스트 */}
            <div className="text-[28px] font-big font-bold mt-[18px]">
                {recognizedText || "..." }
            </div>
            <img src={waves[waveIndex]} alt="voice wave" />
            
            <div className="font-small font-light text-[17px] text-gray400 mb-[32px]">
                {isComplete ? "인식 완료! 채팅창에서 안내할게요!" : "인식 중 입니다"}
            </div>
        </div>
    );
}