// 전역 변수들
let ws = null;
let isConnected = false;
let isConnecting = false;
let messageHandlers = {};
let connectionAttempts = 0;
let sessionReady=false;
let readyWaiters=[];
let userTranscripts = {}; //사용자 발화 누적 저장
let aiTranscripts= {}; //ai 응답 누적 저장
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
  if (isConnected || isConnecting) {
    console.log("이미 연결 중이거나 연결되었습니다");
    return Promise.resolve();
  }

  isConnecting = true; // 연결 시도 중 또는 연결 완료 상태 X -> 연결 시도
  connectionAttempts++;

  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      //소켓 연결 성공 시
      ws.onopen = function() {
        isConnected = true;
        isConnecting = false;
        connectionAttempts = 0;//연결 시도 횟수 초기화
        userTranscripts = {};
        aiTranscripts = {};
        resolve();
      };
      
      //서버->클라 메시지
      ws.onmessage = function(event) {
        if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            handleMessage(message);
        } else if (event.data instanceof ArrayBuffer) {
          handleMessageBinary(event.data);
        } else if (event.data instanceof Blob) {
            handleMessageBlob({ type: '', data: event.data});
        }
      };
      
      //소켓 연결 종료
      ws.onclose = function() {
        isConnected = false;
        isConnecting = false;
      };
      
      //소켓 연결 오류
      ws.onerror = function(error) {
        isConnected = false;
        isConnecting = false;
        //재연결시도
        if (connectionAttempts < maxConnectionAttempts) {
          setTimeout(() => {
            connect(url);
          }, 2000);
        }
        reject(error);
      };

    } catch (error) {
      isConnecting = false;
      reject(error);
    }
  });
}

// 메시지 처리
function handleMessage(data) {
  const { channel, type } = data;

  // 서버 에러 (type 없이 옴)
  if (channel === 'openai:error') {return;}
  if (!type && !channel) {return;}

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

  //blob형태를 이진 처리 함수로 전달
  async function handleMessageBlob(blob) {
   try {
     const arrayBuffer = await blob.arrayBuffer();
     await handleMessageBinary(arrayBuffer);
   } catch (e) {
     console.error('Blob 처리 실패:', e);
   }
 }

 //소리를 숫자샘플로 표현(PCM)
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
     await playAudioBuffer(arrayBuffer);
   } catch (e) {
     await playPCMAudio(arrayBuffer);
   }
 }

// pcm을 Float32로 포맷 후 큐에 버퍼를 넣음
async function playPCMAudio(arrayBuffer) {
  if (!audioContext) return;
  try {
    const pcm = new Int16Array(arrayBuffer);
    const f32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) 
      f32[i] = Math.max(-1, Math.min(1, pcm[i] / 32768));
    const sampleRate = 24000;
    const buf = audioContext.createBuffer(1, f32.length, sampleRate);
    buf.getChannelData(0).set(f32);
    audioQueue.push(buf);
    if (!isPlayingAudio) playNextAudio();
  } catch (error) {
    console.error('PCM 오디오 재생 실패:', error);
  }
}

//큐를 실행
async function playNextAudio() { //audioQueue는 전역이라 인자로 안받아도 됨
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

// 핸들러 등록
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
  } else {
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
    }
  }
}

//payload를 포함한 메시지 전송
function send(channel, type, payload = {}) {
  if (!ws || !isConnected) {
    console.error('WebSocket이 연결되지 않음. 현재 상태:', { 
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
  
  //메시지 전송
  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    return false;
  }
}

//음성 발화 시작
function startSpeaking() {
  return true;
}

// 사용자 음성 pcm16->base64변환->서버로 전송
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
  if(hasAudio) send(CHANNEL,'input_audio_buffer.commit');
  return send(CHANNEL,'input_audio_buffer.end');
}

//프리프롬프트 말풍선?
function sendText(text) {
  return send(CHANNEL, 'input_text', {text});
}

function selectPrePrompt(option) {
  return send(CHANNEL, 'preprompted', {enum: option});
}

function requestSummary() {
  if (!ws || !isConnected) {
    console.error('WebSocket이 연결되지 않음');
    return false;
  }
  
  const message = {
    channel: 'sonju:summarize'
  };
  
  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    console.error('요약 요청 실패:', error);
    return false;
  }
}

//디바이스에서 좌표를 얻음
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
                console.error('위치 정보 가져오기 실패:', error);
                reject(error);
            },
            { enableHighAccuracy: true ,
                timeout: 5000,
                maximumAge: 180000
            }
        );
    });
}

//위에서 얻은 좌표를 서버에 전송
function sendUserLocation(lat,lon) {
    return send('sonju:currentCoord', 'userCoord', { lat, lon });
}

function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
    isConnected = false;
    isConnecting = false;
  }
}

function clearAllHandlers() {
  messageHandlers = {};
}

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
  sendAudioPCM16: sendAudioPCM16,
  stopSpeaking: stopSpeaking,
  sendText:sendText,
  selectPrePrompt: selectPrePrompt,
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