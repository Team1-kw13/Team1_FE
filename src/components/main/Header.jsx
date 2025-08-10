import { useNavigate } from "react-router-dom";
import hamburgerMenuImg from "../../assets/images/hamburger-menu.svg";
import headersvg from "../../assets/images/header.svg";

export default function Header() {
  const navigate = useNavigate();

  const handleMenuClick = () => {
    navigate("/");
  };//<손주ai> 누르면 홈화면 이동

  return (
    <div className="flex justify-between items-center px-[24px]"
      style={{ backgroundImage: `url("${headersvg}")`, height: "119px" }}>
      <header onClick={handleMenuClick} className="text-[33px] font-logo cursor-pointer">
        손주AI
      </header>
      <button className="bg-transparent border-none">
        <img src={hamburgerMenuImg} alt="Menu" />
      </button>
    </div>
  )
}
