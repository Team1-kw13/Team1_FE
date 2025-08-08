import Header from "./header"
import Intro from "./Intro"
import ServiceButtons from "./ServiceButtons"
import BottomNav from "./BottomNav"

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <Intro />
      <ServiceButtons />
      <BottomNav />
    </div>
  )
}
