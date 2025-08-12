import Header from "../../components/main/Header"
import Intro from "../../components/main/Intro"
import ServiceButtons from "../../components/main/ServiceButtons"
import BottomNav from "../../components/main/BottomNav"

export default function Page() {
  return (
    <div className="flex flex-col justify-between max-h-screen w-[430px]">
      <Header />
      <Intro />
      <ServiceButtons />
      <BottomNav />
    </div>
  )
}
