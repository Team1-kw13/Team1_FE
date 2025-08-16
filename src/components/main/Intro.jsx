import GradientBackground from "../../assets/images/gadientBackground.png"
import Sun from "../../assets/images/sun.svg"
export default function Intro() {
  return (
    <>
    <div className="h-[455px] bg-gray100" style={{backgroundImage: `url(${GradientBackground})`}}>
      <div className="pl-[46px]">
        <div className="font-big font-extrabold text-[37px] pb-[10px] animate-fadeUp animation-delay-400">
          <header>반가워요</header>
          <div className="flex mt-[-10px]">
            <header className="text-yellow">손주AI</header>
            <header>&nbsp;에요!</header>
          </div>
        </div>  
        <div className="font-big font-bold text-[18px] animate-fadeUp animation-delay-600">노원구 주민들을 위한<br></br>AI 민원 음성 안내 서비스</div>
      </div>
      <div className="flex justify-end pr-[16px] mt-[-32px]">
        <img src={Sun} alt="sun"></img>
      </div>
    </div>
    </>
  )
}