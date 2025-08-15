import {useState} from "react"
import Header from "../../components/main/Header"
import Intro from "../../components/main/Intro"
import ServicingSun from "../../components/main/ServicingSun"
import ServiceButtons from "../../components/main/ServiceButtons"
import Servicing from "../../components/main/Servicing"
import BottomNav from "../../components/main/BottomNav"
import MicButton from "../../components/main/MicButton"

export default function Page() {
  const [isMicClicked,setIsMicClicked]=useState(false);

  return (
    <div className="flex flex-col justify-between max-h-screen w-[430px]">
      <Header />
      {isMicClicked?<ServicingSun />:<Intro/>}
      {isMicClicked?<Servicing/>:<ServiceButtons />}
      <BottomNav />
    </div>
  )
}