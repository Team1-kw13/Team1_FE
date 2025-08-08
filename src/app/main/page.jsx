import Header from "../../components/main/Header"
import Intro from "../../components/main/Intro"
import ServiceButtons from "../../components/main/ServiceButtons"
import BottomNav from "../../components/main/BottomNav"

export default function Page() {
  return (
    <div className="bg-yellow flex flex-col min-h-screen">
      <Header />
      <Intro />
      <ServiceButtons />
      <BottomNav />
    </div>
  )
}
