import GradientBackground from "../../assets/images/gadientBackground.png"
import Sun from "../../assets/images/sun.svg"
export default function Intro() {
  return (
    <>
    <div class='h-[455px]' style={{background: `url(${GradientBackground})`}}>
      <div class="pl-[46px]">
        <div class="font-big font-extrabold text-[37px] pb-[10px]">
          <header>반가워요</header>
          <div class="flex mt-[-10px]">
            <header class="text-yellow">손주AI</header>
            <header>&nbsp;에요!</header>
          </div>
        </div>  
        <div class="font-big font-bold text-[18px]">노원구 주민들을 위한<br></br>AI 민원 음성 안내 서비스</div>
      </div>
      <div class="flex justify-end pr-[16px] mt-[-32px]"><img src={Sun} alt="sun" class=""></img></div>
    </div>
    </>
  )
}