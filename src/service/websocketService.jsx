// 전역 변수들
let ws = null;
let isConnected = false;
let isConnecting = false;
let messageHandlers = {};
let connectionAttempts = 0;
let sessionReady=false;
let readyWaiters=[];
let audioContext = null;
let audioQueue = [];
let isPlayingAudio = false;
const maxConnectionAttempts = 3;
const CHANNEL='openai:conversation';

function ensureAudio() {
  if (!audioContext) {
    // 24kHz로 내려오면 sampleRate를 맞춰주는 게 베스트(모르면 기본값도 OK)
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    } catch {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
}

// 사용자 제스처 직후(버튼 클릭/마이크 시작 등) 반드시 호출
async function resumeAudioContextIfNeeded() {
  ensureAudio();
  if (audioContext && audioContext.state === 'suspended') {
    try { await audioContext.resume(); } catch {}
  }
}

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
      ws.binaryType = 'arraybuffer';
      
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
        } else if (event.data instanceof ArrayBuffer) {
          handleMessageBinary(event.data);
        } else if (event.data instanceof Blob) {
            console.log ("서버에서 받은 오디오(Blob) 메세지: ", event.data);
            handleMessageBlob({ type: '', data: event.data});
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

// 오디오 Blob 처리
async function handleAudioBlob(blob) {
  try {
    console.log('오디오 Blob 처리 시작:', { size: blob.size, type: blob.type });
    
    // 최소 크기 체크
    // if (blob.size < 100) {
    //   console.warn('오디오 Blob 크기가 너무 작음:', blob.size);
    //   return;
    // }
    
    const arrayBuffer = await blob.arrayBuffer();
    
    // PCM 데이터로 직접 처리
    await playPCMAudio(arrayBuffer);
    
  } catch (error) {
    console.error('오디오 Blob 처리 실패:', error);
  }
}

 async function handleMessageBlob(blob) {
   try {
     const arrayBuffer = await blob.arrayBuffer();
     await handleMessageBinary(arrayBuffer);
   } catch (e) {
     console.error('Blob 처리 실패:', e);
   }
 }

 async function handleMessageBinary(arrayBuffer) {
   const bytes = new Uint8Array(arrayBuffer);
   const isRIFF = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // 'RIFF'
   const isOgg  = bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53; // 'OggS'
   const isID3  = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;                       // 'ID3'

   await resumeAudioContextIfNeeded();
   if (!audioContext) return;

   try {
     if (isRIFF || isOgg || isID3) {
       await playAudioBuffer(arrayBuffer);
       return;
     }
     await playAudioBuffer(arrayBuffer); // 브라우저가 코덱 추론 가능 시
   } catch (e) {
     console.warn('decodeAudioData 실패 → PCM 폴백 시도:', e);
     await playPCMAudio(arrayBuffer); // 24kHz mono PCM16 가정
   }
 }


// PCM 오디오 직접 재생
async function playPCMAudio(arrayBuffer) {
  if (!audioContext) return;
  try {
    const pcm = new Int16Array(arrayBuffer);
    const f32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f32[i] = Math.max(-1, Math.min(1, pcm[i] / 32768));
    const sampleRate = 24000;
    const buf = audioContext.createBuffer(1, f32.length, sampleRate);
    buf.getChannelData(0).set(f32);
    audioQueue.push(buf);
    if (!isPlayingAudio) playNextAudio();
  } catch (error) {
    console.error('PCM 오디오 재생 실패:', error);
  }
}

// 오디오 재생
async function playAudioBuffer(arrayBuffer) {
  if (!audioContext) return;
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    audioQueue.push(audioBuffer);
    if (!isPlayingAudio) playNextAudio();
  } catch (error) {
    console.error('오디오 디코딩 실패:', error);
    throw error;
  }
  
}

async function playNextAudio() {
  if (audioQueue.length === 0) { isPlayingAudio = false; return; }
  isPlayingAudio = true;
  const source = audioContext.createBufferSource();
  source.buffer = audioQueue.shift();
  source.connect(audioContext.destination);
  source.onended = () => playNextAudio();
  try { source.start(); } catch (e) {
    console.error('오디오 시작 실패:', e);
    isPlayingAudio = false;
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
  return true;
}

// 사용자 음성 발화
// PCM16 ArrayBuffer(또는 Int16Array.buffer)를 그대로 보냄?
function sendAudioPCM16(arrayBuffer) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    let s = '';
    for (let i = 0; i < uint8.length; i++) s += String.fromCharCode(uint8[i]);
    const base64 = btoa(s);
    
    return send(CHANNEL, 'input_audio_buffer.append', {
      audio_buffer: base64
    });
  } catch (error) {
    console.error("오디오 전송 실패:", error);
    return false;
  }
}

function stopSpeaking(hasAudio=true) {
  console.log('🛑 음성 발화 종료');
  if(hasAudio) send(CHANNEL,'input_audio_buffer.commit');
  return send(CHANNEL,'input_audio_buffer.end');
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
  selectPrePrompt: selectPrePrompt,
  sendText:sendText,
  playAudioBuffer,
  resumeAudioContextIfNeeded,
  
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