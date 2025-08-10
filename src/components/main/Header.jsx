import { useNavigate } from "react-router-dom";
import hamburgerMenuImg from "../../assets/images/hamburger-menu.svg";
import headersvg from "../../assets/images/header.svg";

export default function Header() {
  const navigate = useNavigate();

  const handleMenuClick = () => {
    navigate("/");
  };

  return (
    <div className="flex justify-between items-center p-4"
      style={{ backgroundImage: `url("${headersvg}")`, height: "119px" }}>
      <header onClick={handleMenuClick} className="text-[33px] font-logo font-bold cursor-pointer">
        손주AI
      </header>
      <button className="bg-transparent border-none">
        <img src={hamburgerMenuImg} alt="Menu" />
      </button>
    </div>
  )
}
