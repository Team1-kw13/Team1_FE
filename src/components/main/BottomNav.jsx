import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MicButton from "./MicButton.jsx";
import homeMenuImage from "../../assets/images/home-menu.svg";
import userImage from "../../assets/images/user.svg";
import ServicePreparingModal from "../_common/ServicePreparing.jsx";
//import webSocketService from "../../service/websocketService.jsx";

export default function BottomNav({ 
  onListeningStart, 
  onListeningStop, 
  onTranscriptUpdate,
  onRecognitionError,
//  onRecognitionComplete, //음성 인식 완료 추가
//  isInChatRoom = false, //채팅창 여부 추가
  currentStep,
  onCallIntent
}) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMenuClick = () => {
    navigate("/", { replace: true });
  };//<홈> 누르면 홈화면 이동

  const handleUserInfoClick = () => {
    setIsModalOpen(true);
  };//내 정보 버튼 클릭 시 모달 열기

  // const handleChatRoomVoiceStart = () => {
  //   webSocketService.startSpeaking();
  // };//채팅창에서 사용자 발화

  // const handleChatRoomVoiceStop = (recognizedText) => {
  //   if (onRecognitionComplete) {
  //     onRecognitionComplete(recognizedText);
  //   }
  // };//음성 인식 완료 시 상위 컴포넌트에 전달

  return (
    <div className="bg-gray100 h-[139px] pt-[18px] pb-[32px]">
      <nav className="flex justify-between items-end relative overflow-visible">
        <div className="flex flex-col items-center gap-[6px] pl-[53px] pt-[46px]">
          <button onClick={handleMenuClick}>
            <img src={homeMenuImage} alt="홈" className="w-[24px] h-[24px]" />
          </button>
          <div className="text-center text-[12px] font-big font-bold text-yellow">
            홈
          </div>
        </div>
        
        <MicButton 
          onListeningStart={onListeningStart}
          onListeningStop={onListeningStop}
          onTranscriptUpdate={onTranscriptUpdate}
          onRecognitionError={onRecognitionError}
          currentStep={currentStep}
          onCallIntent={onCallIntent}
        />

        <div onClick={handleUserInfoClick} className="flex flex-col items-center gap-[6px] pr-[47.25px] pt-[46px]">
          <button>
            <img src={userImage} alt="내 정보" className="w-[24px] h-[24px]" />
          </button>
          <div className="text-center text-[12px] font-big font-bold text-gray450">
            내 정보
          </div>
        </div>

        <ServicePreparingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </nav>
    </div>
  )
}