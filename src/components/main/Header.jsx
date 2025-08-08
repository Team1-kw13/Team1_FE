import hamburgerMenuImg from "../../assets/images/hamburger-menu.svg";
import headersvg from "../../assets/images/header.svg";

export default function Header() {
  return (
    <div className="flex justify-between items-flex-end">
      <header className="bg-cover bg-center p-4 text-[33px] font-logo font-bold" style={{backgroundImage: `url(${headersvg})`}}>
        손주AI
      </header>
      <button className="bg-transparent border-none">
        <img src={hamburgerMenuImg} alt="Menu" />
      </button>
    </div>

  )
}
