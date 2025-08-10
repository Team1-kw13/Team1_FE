import Mike from "../../assets/images/mic_fill.svg"

export default function ServiceButtons() {
  return (
    <div className="bg-gray100">
      <div className="flex gap-[4px]">
        <img src={Mike} alt="mike" ></img>
        <header className="font-big font-bold text-[28px]">
          무엇을도와드릴까요?
        </header>
      </div>
    </div>
  )
}