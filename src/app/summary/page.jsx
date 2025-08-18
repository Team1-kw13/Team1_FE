import Summary from "../../components/summary/summary";
import BottomNav from "../../components/main/BottomNav";
import Header from "../../components/main/Header";

export default function SummaryPage() {
  return (
    <div className="flex flex-col h-screen w-full max-w-[430px]">
      <Header />

      <div className="flex-1 overflow-hidden w-full min-w-[430px]"
           style={{ scrollbarWidth: "none", msOverflowStyle: "none", marginTop: "-30px" }}>
        <style>
          {`
            ::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        <Summary />
      </div>

      <BottomNav />
    </div>
  )
}