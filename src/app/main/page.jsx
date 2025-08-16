import {useState} from "react"
import Header from "../../components/main/Header"
import Intro from "../../components/main/Intro"
import ServicingSun from "../../components/main/ServicingSun"
import ServiceButtons from "../../components/main/ServiceButtons"
import Servicing from "../../components/main/Servicing"
import BottomNav from "../../components/main/BottomNav"

export default function Page() {
  const [listeningStatus, setListeningStatus] = useState("idle");
  useEffect(() => {
    setTimeout(() => setListeningStatus("listening"), 2000);
    setTimeout(() => setListeningStatus("complete"), 4000);
  }, []);
  /*테스트용 흐름. 음성인식 API이벤트랑 연동해야함*/

  return (
    <div className="flex flex-col justify-between max-h-screen w-[430px]">
      <Header />

      {listeningStatus === "idle" && <Intro />}
      {listeningStatus === "listening" && <ServicingSun />}
      {listeningStatus === "complete" && <ServicingSun />}

      {listeningStatus === "idle" && <ServiceButtons />}
      {listeningStatus === "listening" && <Servicing />}
      {listeningStatus === "complete" && <ServiceComplete />}

      <BottomNav />
    </div>
  )
}
