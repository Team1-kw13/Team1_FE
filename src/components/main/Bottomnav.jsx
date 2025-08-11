import MicButton from "./MicButton.jsx";
import homeMenuImage from "../../assets/images/home-menu.svg";
import userImage from "../../assets/images/user.svg";

export default function BottomNav() {
  return (
    <nav className="bg-gray100 h-[139px] flex items-center justify-between">
      <button><img src={homeMenuImage} alt="Home Menu" className="w-[32px] h-[32px]" /></button>
      <MicButton className="pt-[17.5px] pb-[30.5px]"></MicButton>
      <button><img src={userImage} alt="User Menu" className="w-[32px] h-[32px]" /></button>
    </nav>
  )
}