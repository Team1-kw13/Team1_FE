import { useState } from "react";
import { useNavigate } from "react-router-dom";
import hamburgerMenuImg from "../../assets/images/hamburger-menu.svg";
import headersvg from "../../assets/images/header.svg";
import ServicePreparingModal from "../_common/ServicePreparing";

export default function Header() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMenuClick = () => {
    navigate("/", {replace: true });
  };//<손주ai> 누르면 홈화면 이동

  const handleHamburgerClick = () => {
    setIsModalOpen(true);
  };//햄버거 메뉴 클릭 시 모달 열기

  return (
    <div className="flex justify-between items-center px-[24px]"
      style={{ backgroundImage: `url("${headersvg}")`, height: "119px" }}>
      <header onClick={handleMenuClick} className="text-[33px] font-logo cursor-pointer text-[#302200]">
        손주AI
      </header>
      <button onClick={handleHamburgerClick} className="bg-transparent border-none">
        <img src={hamburgerMenuImg} alt="Menu" />
      </button>
      <ServicePreparingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
