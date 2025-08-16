import Sun from "../../assets/images/sun.svg"
import GradientBackground from "../../assets/images/gadientBackground.png"

export default function ServicingSun(){
    return(
        <>
        <div className="h-[455px] w-[430px] bg-gray100" style={{backgroundImage:`url(${GradientBackground})`}}>
            <div className="h-[101px] font-bold font-big text-[37px] text-center">
                지금 <span className="text-yellow">손주</span>가<br/>잘 듣고 있어요
            </div>
            <div className="flex justify-center">
                <img src={Sun} className="w-[264px] h-[264px]"></img>
            </div>
        </div>
        </>
    )
}