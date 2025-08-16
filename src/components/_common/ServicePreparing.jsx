import Modal from "./Modal";
import Sun from "../../assets/images/sun.svg";

export default function ServicePreparingModal({ isOpen, onClose }) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      showCloseButton={true}
      className="max-w-sm"
    >
      <div className="flex flex-col items-center text-center py-4">
        {/* 손주 아이콘 */}
        <div className="mb-4">
          <img src={Sun} alt="손주" className="w-16 h-16" />
        </div>
        
        {/* 메시지 */}
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          서비스 준비중입니다!
        </h3>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          더 나은 서비스를 위해<br />
          열심히 준비하고 있어요
        </p>
        
        {/* 로딩 애니메이션 */}
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-yellow rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
          <div className="w-2 h-2 bg-yellow rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
          <div className="w-2 h-2 bg-yellow rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        </div>
      </div>
    </Modal>
  );
}