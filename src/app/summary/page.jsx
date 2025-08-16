import Summary from "../../components/summary/summary";
import BottomNav from "../../components/main/BottomNav";
import Header from "../../components/main/Header";

export default function SummaryPage() {
  return (
    <div className="flex flex-col h-screen w-[430px]">
      <div className="fixed top-0 w-full max-w-[430px]">
        <Header />
      </div>
      
      <div className="flex flex-1 overflow-hidden relative z-30
                      mt-[89.37px] mb-[130px] w-full max-w-[430px]"
           style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <style>
          {`
            ::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        <Summary />
      </div>

      <div className="fixed bottom-0 w-full max-w-[430px] bottom-nav">
        <BottomNav />
      </div>
    </div>
  )
}