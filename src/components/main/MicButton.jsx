import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import micIcon from "../../assets/images/mic_fill.svg";
import stopIcon from "../../assets/images/stop.svg";

export default function MicButton() {
    const [isListening, setIsListening] = useState(false);
    const navigate = useNavigate();
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!("webkitSpeechRecognition" in window) || "SpeechRecognition" in window) {
            alert("음성 인식이 지원되지 않는 브라우저입니다.");
            return;
        } else {
            
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();

            recognitionRef.current.continuous = true; //연속 인식 여부
            recognitionRef.current.interimResults = true; //중간 결과 허용 여부
            recognitionRef.current.lang = "ko-KR"; //한국어

            recognitionRef.current.onstart = () => {
                setIsListening(true);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                navigate("/chatroompage");
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
            };
        }
    }, [navigate]);

    const handleMicClick = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };
    
  return (
    <button onClick={handleMicClick} className="flex gap-[10px] items-center bg-yellow px-[37px] py-[24px] text-[28px] font-bold w-[195px] h-[91px] rounded-[100px] border-[3px] border-white hover:border-yellow">
      <img src={isListening ? stopIcon : micIcon} alt="Mic Icon" className="w-6 h-6" />
      {isListening ? "인식중" : "말하기"}
    </button>
  )
}