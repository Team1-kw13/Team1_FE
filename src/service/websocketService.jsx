// 전역 변수들
let ws = null;
let isConnected = false;
let isConnecting = false;
let messageHandlers = {};
let connectionAttempts = 0;
let sessionReady=false;
let readyWaiters=[];
const maxConnectionAttempts = 3;
const CHANNEL='openai:conversation';

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

  isConnecting = true; // 연결 시도 중 또는 연결 완료 상태 X -> 연결 시도
  connectionAttempts++;

  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(url); // 소켓 연결
      
      ws.onopen = function() { // 소켓이 열림 = 연결 성공
        console.log('✅ WebSocket 연결 성공');
        isConnected = true;
        isConnecting = false;
        connectionAttempts = 0; // 연결 성공 -> 연결 시도 횟수 초기화
        
        {/*
        // 임시 해결: 서버가 READY 신호를 안 줄 때 클라에서 바로 세션 ready 처리
        sessionReady = true;
        readyWaiters.forEach(r => r());
        readyWaiters = [];
        */}
        
        resolve();
      };
      
      ws.onmessage = function(event) { // 서버 -> 클라 메세지
        if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            console.log ("서버에서 받은 string type 메세지: ", message);
            handleMessage(message);
        } else if (typeof event.data instanceof Blob) {
            console.log ("서버에서 받은 오디오(Blob) 메세지: ", event.data);
            handleMessage({ type: '', data: event.data});
        } else {
            console.log ("서버에서 JSON, Blob 이외의 type 메세지 수신: ", event.data);
        }
      }; //GPT 응답 관련 코드 임시 연결 종료
      
      ws.onclose = function() { // 소켓 연결 종료
        console.log('🔌 WebSocket 연결 종료');
        isConnected = false;
        isConnecting = false;
      };
      
      ws.onerror = function(error) { // 소켓 연결 오류
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

    // 서버 에러 패킷 처리 (type 없이 옴)
  if (channel === 'openai:error') {
    console.error('🛑 서버 오류:', data.code, data.message);
    return;
  }
  
  // 유효성 체크
  if (!type && !channel) {
    console.warn('알 수 없는 메시지 형식:', data);
    return;
  }

  if( type && type.includes('input_audio_transcript')) { //0820수정
    console.log('사용자 음성 인식 메세지' ,{channel, type, data});
  }

  // 1) 정확히 일치 (channel:type)
  const keys = [];
  if (channel && type) keys.push(`${channel}:${type}`);

  // 2) 타입-only 리스너 (예: 'preprompted')까지 호출
  if (type) keys.push(type);

  // 3) 채널 와일드카드 (예: 'openai:conversation:*')까지 호출
  if (channel) keys.push(`${channel}:*`);

  // 등록된 핸들러 실행
  keys.forEach((k) => {
    const handlers = messageHandlers[k];
    if (handlers && handlers.length) {
      handlers.forEach((handler) => {
        try { 
            handler(data); 
        } catch (error) { 
            console.error('핸들러 실행 오류:', error); 
        }
      });
    }
  });

  
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
//    console.log('📝 핸들러 등록:', key);
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
//      console.log('🗑️ 핸들러 제거:', key);
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
    return true;
  } catch (error) {
    console.error('❌ 메시지 전송 실패:', error);
    return false;
  }
}

// === 대화 관련 함수들 ===
function startSpeaking() {
  console.log('🎤 음성 발화 시작');
  //return send(CHANNEL,'input_audio_buffer.commit');
  return true;
}

// 사용자 음성 발화
// PCM16 ArrayBuffer(또는 Int16Array.buffer)를 그대로 보냄?
function sendAudioPCM16(base64AudioData) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try { 
    const binaryString = atob (base64AudioData);
    const bytes = new Uint8Array (binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }    

    ws.send(bytes.buffer);
    console.log("오디오 청크 전송 크기: ", bytes.length, 'bytes');
    return true;
  } catch (e) { 
    console.error("사용자 음성 발화 전송 실패: ", e); 
    return false; 
  }
}

function stopSpeaking(hasAudio=true) {
  console.log('🛑 음성 발화 종료');
  //return send(CHANNEL, 'input_audio_buffer.end');
  if(hasAudio) send(CHANNEL,'input_audio_buffer.commit');
  return send(CHANNEL,'input_audio_buffer.end');
}

function sendPrePrompt(option) {
  return send(CHANNEL, 'preprompted', {enum: option});
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

//위치 정보 관련 함수
function sendUserLocation(lat,lon) {
    console.log('📍 사용자 위치 전송:', { lat, lon });
    return send('sonju:currentCoord', 'userCoord', { lat, lon });
}

function sendCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.error('Geolocation API를 지원하지 않습니다.');
            reject(new Error('Geolocation API를 지원하지 않습니다.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log('현재 위치:', { latitude, longitude });

                const locationSent = sendUserLocation(latitude, longitude);
                if (locationSent) {
                    resolve({ latitude, longitude });
                } else {
                    reject(new Error('위치 정보 전송 실패'));
                }
            },
            (error) => {
                console.error('❌ 위치 정보 가져오기 실패:', error);
                reject(error);
            },
            { enableHighAccuracy: true ,
                timeout: 5000,
                maximumAge: 180000
            }
        );
    });
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
  sendPrePrompt: sendPrePrompt,
  //selectPrePrompt: selectPrePrompt,
  //sendText:sendText,
  
  // 요약 관련
  requestSummary: requestSummary,

  //위치 관련
  sendUserLocation: sendUserLocation,
  sendCurrentLocation: sendCurrentLocation,
  
  // 상태 확인
  get isConnected() {
    return isConnected;
  },
  
  get isConnecting() {
    return isConnecting;
  },
  
  getStatus: getConnectionStatus,
  waitReady
};

export default webSocketService;

//서버가 READY될때까지 기다렸다가 commit보냄
export function waitReady() {
  return sessionReady ? Promise.resolve() : new Promise(r => readyWaiters.push(r));
}