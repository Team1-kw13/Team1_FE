// 전역 변수들
let ws = null;
let isConnected = false;
let isConnecting = false;
let messageHandlers = {};
let connectionAttempts = 0;
const maxConnectionAttempts = 3;

// WebSocket 연결
function connect(url = import.meta.env.VITE_WEBSOCKET_URL) {
  // 이미 연결되어 있으면 기존 연결 사용
  if (isConnected) {
    console.log('✅ 이미 WebSocket이 연결되어 있습니다');
    return Promise.resolve();
  }

  // 연결 시도 중이면 대기
  if (isConnecting) {
    console.log('⏳ WebSocket 연결 시도 중입니다');
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (isConnected) {
          resolve();
        } else if (!isConnecting) {
          resolve(); // 연결 실패해도 resolve
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  console.log('🔌 WebSocket 연결 시도:', url);
  isConnecting = true;
  connectionAttempts++;

  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(url);
      
      ws.onopen = function() {
        console.log('✅ WebSocket 연결 성공');
        isConnected = true;
        isConnecting = false;
        connectionAttempts = 0;
        resolve();
      };
      
      ws.onmessage = function(event) {
        console.log('📩 메시지 받음:', event.data);
        
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('❌ 메시지 파싱 오류:', error);
        }
      };
      
      ws.onclose = function() {
        console.log('🔌 WebSocket 연결 종료');
        isConnected = false;
        isConnecting = false;
      };
      
      ws.onerror = function(error) {
        console.error('❌ WebSocket 에러:', error);
        isConnected = false;
        isConnecting = false;
        
        if (connectionAttempts < maxConnectionAttempts) {
          setTimeout(() => {
            console.log(`🔄 재연결 시도 ${connectionAttempts}/${maxConnectionAttempts}`);
            connect(url);
          }, 2000);
        }
        
        reject(error);
      };

    } catch (error) {
      console.error('WebSocket 생성 실패:', error);
      isConnecting = false;
      reject(error);
    }
  });
}

// 메시지 처리
function handleMessage(data) {
  const { channel, type } = data;
  
  let handlerKey;
  if (channel && type) {
    handlerKey = `${channel}:${type}`;
  } else if (type && !channel) {
    handlerKey = type;
  } else {
    console.warn('알 수 없는 메시지 형식:', data);
    return;
  }
  
  console.log('🔄 메시지 처리:', handlerKey);
  
  // 등록된 핸들러가 있으면 실행
  if (messageHandlers[handlerKey]) {
    messageHandlers[handlerKey].forEach(function(handler) {
      try {
        handler(data);
      } catch (error) {
        console.error('핸들러 실행 오류:', error);
      }
    });
  }
  
  // 서버 연결 확인 메시지 처리
  if (type === 'CONNECTED') {
    console.log('✅ 서버 연결 확인:', data.data?.clientId);
  }
}

// 핸들러 등록 (중복 방지)
function on(channelOrType, typeOrHandler, handler) {
  let key;
  let handlerFunction;
  
  if (typeof typeOrHandler === 'function') {
    key = channelOrType;
    handlerFunction = typeOrHandler;
  } else {
    key = `${channelOrType}:${typeOrHandler}`;
    handlerFunction = handler;
  }
  
  if (!messageHandlers[key]) {
    messageHandlers[key] = [];
  }
  
  // 중복 핸들러 방지
  if (!messageHandlers[key].includes(handlerFunction)) {
    messageHandlers[key].push(handlerFunction);
    console.log('📝 핸들러 등록:', key);
  } else {
    console.log('⚠️ 이미 등록된 핸들러:', key);
  }
}

// 핸들러 제거
function off(channelOrType, typeOrHandler, handler) {
  let key;
  let handlerFunction;
  
  if (typeof typeOrHandler === 'function') {
    key = channelOrType;
    handlerFunction = typeOrHandler;
  } else {
    key = `${channelOrType}:${typeOrHandler}`;
    handlerFunction = handler;
  }
  
  if (messageHandlers[key]) {
    const initialLength = messageHandlers[key].length;
    messageHandlers[key] = messageHandlers[key].filter(function(h) {
      return h !== handlerFunction;
    });
    
    if (messageHandlers[key].length < initialLength) {
      console.log('🗑️ 핸들러 제거:', key);
    }
  }
}

// 메시지 전송
//서버가 요구하는 type, data형태로만 전송하기xxxx
//payload를 평평하게 보내기?
function send(channel, type, payload = {}) {
  if (!ws || !isConnected) {
    console.error('❌ WebSocket이 연결되지 않음. 현재 상태:', { 
      wsExists: !!ws, 
      isConnected, 
      isConnecting 
    });
    return false;
  }
  
  
  const message = {
    channel,
    type,
    ...payload
  };
  
  try {
    console.log('📤 메시지 전송:', message);
    ws.send(JSON.stringify(message));
  } catch (error) {
    console.error('❌ 메시지 전송 실패:', error);
    return false;
  }
}

// === 대화 관련 함수들 ===
function startSpeaking() {
  console.log('🎤 음성 발화 시작');
  return send('openai:conversation', 'input_audio_buffer.commit');
}

// PCM16 ArrayBuffer(또는 Int16Array.buffer)를 그대로 보냄?
function sendAudioPCM16(arrayBuffer) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try { ws.send(arrayBuffer); return true; } catch (e) { console.error(e); return false; }
}

function stopSpeaking() {
  console.log('🛑 음성 발화 종료');
  return send('openai:conversation', 'input_audio_buffer.end');
}

function sendText(text) {
  console.log('📝 텍스트 전송:', text);
  return send('openai:conversation', 'input_text', {text});
}

function selectPrePrompt(option) {
  return send('openai:conversation', 'preprompted', {enum: option});
}

function requestSummary() {
  if (!ws || !isConnected) {
    console.error('❌ WebSocket이 연결되지 않음');
    return false;
  }
  
  const message = {
    channel: 'sonju:summarize'
  };
  
  try {
    console.log('📤 요약 요청:', message);
    ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('❌ 요약 요청 실패:', error);
    return false;
  }
}

function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
    isConnected = false;
    isConnecting = false;
    console.log('🔌 연결 종료');
  }
}

// 모든 핸들러 제거 (컴포넌트 언마운트 시)
function clearAllHandlers() {
  messageHandlers = {};
  console.log('🗑️ 모든 핸들러 제거');
}

// 연결 상태 확인
function getConnectionStatus() {
  return {
    isConnected,
    isConnecting,
    hasWebSocket: !!ws,
    connectionAttempts
  };
}

const webSocketService = {
  connect: connect,
  disconnect: disconnect,
  on: on,
  off: off,
  send: send,
  clearAllHandlers: clearAllHandlers,
  
  // 대화 관련
  startSpeaking: startSpeaking,
  sendAudioPCM16,
  stopSpeaking: stopSpeaking,
  sendText: sendText,
  selectPrePrompt: selectPrePrompt,
  
  // 요약 관련
  requestSummary: requestSummary,
  
  // 상태 확인
  get isConnected() {
    return isConnected;
  },
  
  get isConnecting() {
    return isConnecting;
  },
  
  getStatus: getConnectionStatus
};

export default webSocketService;