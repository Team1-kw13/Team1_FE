import { useNavigate } from "react-router-dom";
import MicButton from "./MicButton.jsx";
import homeMenuImage from "../../assets/images/home-menu.svg";
import userImage from "../../assets/images/user.svg";

export default function BottomNav() {
    const navigate = useNavigate();

  const handleMenuClick = () => {
    navigate("/");
  };//<홈> 누르면 홈화면 이동

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
        <MicButton></MicButton>
        <div className="flex flex-col items-center gap-[6px] pr-[47.25px] pt-[46px]">
          <button>
            <img src={userImage} alt="내정보" className="w-[24px] h-[24px]" />
          </button>
          <div className="text-center text-[12px] font-big font-bold text-gray450">
            내정보
          </div>
        </div>
      </nav>
    </div>
  )
}