import MicButton from "./MicButton.jsx";
import homeMenuImage from "../../assets/images/home-menu.svg";
import userImage from "../../assets/images/user.svg";

export default function BottomNav() {
  return (
    <nav className="flex items-center justify-between p-4 bg-yellow-100">
      <button><img src={homeMenuImage} alt="Home Menu" className="w-[32px] h-[32px]" /></button>
      <MicButton />
      <button><img src={userImage} alt="User Menu" className="w-[32px] h-[32px]" /></button>
    </nav>
  )
}