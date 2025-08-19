import {useState,useEffect} from "react"
import { useNavigate } from "react-router-dom"
import Wave1 from "../../assets/images/Voice_Wave1.svg"
import Wave2 from "../../assets/images/Voice_Wave2.svg"
import Wave3 from "../../assets/images/Voice_Wave3.svg"
import Wave4 from "../../assets/images/Voice_Wave4.svg"
import Wave5 from "../../assets/images/Voice_Wave5.svg"
import Listening from "../../assets/images/listening.svg"

const waves=[Wave1,Wave2,Wave3,Wave4,Wave5];

export default function Servicing({isComplete,recognizedText}){
    const [waveIndex, setWaveIndex] = useState(0);
    const navigate=useNavigate();

    /*파형 루프*/
    useEffect(()=>{
        if(!isComplete){
            const interval=setInterval(() => {
                setWaveIndex(prev=>(prev+1)%waves.length);
            }, 300);

            /*텍스트 추출되면 제거*/
            const timer=setTimeout(()=>{
                navigate("/chatroompage");
            },3000)

            return ()=>{
                clearInterval(interval);
                clearTimeout(timer);
            }
        }
    },[isComplete,navigate]);

    /* 텍스트 인식 완료 후 3초 뒤 채팅창 이동 */
    useEffect(()=>{
        if(isComplete && recognizedText){
            const timer=setTimeout(()=>{
                navigate("/chatroompage",{
                    state: {
                        userMessage: recognizedText,
                        timestamp: Date.now()
                    }
                });
            },3000);
            return ()=>clearTimeout(timer);
        }
    },[isComplete,recognizedText,navigate]);

    return (
        <div className="flex flex-col gap-[36px] items-center bg-gray100">
            {/* 인식된 텍스트 */}
            <div className="text-[28px] font-big font-bold">
                {recognizedText
                    ?<span className="pt-[18px]">{recognizedText}</span>
                    :<img src={Listening} className="pt-[20px]"/> //원래 pt-30인데 말풍선잘림
                }
            </div>

            <img 
                src={waves[waveIndex]} 
                alt="voice wave" 
                className="w-[79px] h-[70px]"
            />
            
            <div className="font-small font-light text-[17px] text-gray400 mb-[32px]">
                {isComplete ? "인식 완료! 채팅창에서 안내할게요!" : "인식 중 입니다"}
            </div>
        </div>
    );
}