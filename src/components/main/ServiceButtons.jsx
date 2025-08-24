import {Link, useNavigate} from 'react-router-dom';
import Mike from "../../assets/images/mic_fill.svg";
import webSocketService from '../../service/websocketService';

export default function ServiceButtons() {
  const navigate = useNavigate();

  const handleServiceClick = (content) => {
    webSocketService.selectPrePrompt(content);
    navigate(`/chatroompage/${encodeURIComponent(content)}`);
  };

  return (
    <div className="bg-gray100 flex-1 h-full flex flex-col">
      <div className="flex gap-[4px] mb-[19px] ml-[20px]">                             
        <img src={Mike} alt="mike" ></img>
        <header className="font-big font-bold text-[28px]">
          무엇을 도와드릴까요?
        </header>
      </div>
      <div className="flex justify-between gap-[29px] mx-[30px]">
        {["무더위 쉼터", "동사무소", "등본 발급"].map((content,i)=>(
          <button onClick={() => handleServiceClick(content)} 
            key={i} 
            className="w-fit h-[40px] text-[22px] font-big font-bold text-gray500 
                      bg-gray200 p-[5px] rounded-lg">
            {content}
          </button> //Link -> Navigate 변경
        ))}
      </div>

      <header className='text-[24px] font-small text-gray400 font-light mt-[82px] text-center'>
        말하기를 누르고 말씀해주세요!
      </header>
    </div>
  )
}