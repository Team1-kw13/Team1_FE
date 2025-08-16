import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MicButton from "./MicButton.jsx";
import homeMenuImage from "../../assets/images/home-menu.svg";
import userImage from "../../assets/images/user.svg";
import ServicePreparingModal from "../_common/ServicePreparing.jsx";

export default function BottomNav({ onListeningStart, onListeningStop, currentStep }) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMenuClick = () => {
    navigate("/", { replace: true });
  };//<홈> 누르면 홈화면 이동

  const handleUserInfoClick = () => {
    setIsModalOpen(true);
  };//내 정보 버튼 클릭 시 모달 열기

  return (
    <div className="bg-gray100 h-[139px] pt-[18px] pb-[32px]">
      <nav className="flex justify-between">
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
          currentStep={currentStep}
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