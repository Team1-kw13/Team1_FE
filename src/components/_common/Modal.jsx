import { useEffect } from "react";

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  showCloseButton = true,
  className = "",
  overlayClassName = ""
}) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 모달이 열릴 때 스크롤 방지
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      // 모달이 닫힐 때 스크롤 복원
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // 모달이 열려있지 않으면 렌더링하지 않음
  if (!isOpen) return null;

  // 배경 클릭시 모달 닫기
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center max-w-[430px] max-h-[932px] mx-auto ${overlayClassName}`}
      onClick={handleOverlayClick}
    >
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className={`
        relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 
        transform transition-all duration-300 scale-100 opacity-100
        ${className}
      `}>
        {/* 닫기 버튼 */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
            aria-label="모달 닫기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* 헤더 */}
        {title && (
          <div className="p-6 pb-2">
            <h2 className="text-xl font-bold text-gray-900 pr-8">
              {title}
            </h2>
          </div>
        )}
        
        {/* 컨텐츠 */}
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}