const canvas = document.getElementById('interferenceCanvas');
const ctx = canvas.getContext('2d');
const source1El = document.getElementById('source1');
const source2El = document.getElementById('source2');

const frequency1Input = document.getElementById('frequency1');
const frequency2Input = document.getElementById('frequency2');
const amplitude1Input = document.getElementById('amplitude1');
const amplitude2Input = document.getElementById('amplitude2');
const freq1Value = document.getElementById('freq1Value');
const freq2Value = document.getElementById('freq2Value');
const amp1Value = document.getElementById('amp1Value');
const amp2Value = document.getElementById('amp2Value');
const beatFrequencyEl = document.getElementById('beatFrequency');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const configNameInput = document.getElementById('configName');
const configList = document.getElementById('configList');

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 500;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let audioContext = null;
let oscillator1 = null;
let oscillator2 = null;
let gainNode1 = null;
let gainNode2 = null;
let isPlaying = false;

let sources = {
  source1: { x: 220, y: 270, frequency: 440, amplitude: 1.0 },
  source2: { x: 420, y: 270, frequency: 445, amplitude: 1.0 }
};

let dragState = {
  isDragging: false,
  source: null,
  offsetX: 0,
  offsetY: 0
};

let animationState = {
  animationId: null,
  isRunning: false,
  lastFrameTime: 0,
  frameCount: 0,
  needsRedraw: true
};

function scheduleRedraw() {
  animationState.needsRedraw = true;
}

function renderInterference() {
  const pixelData = WaveCalculator.calculateInterferenceImage(
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    sources.source1,
    sources.source2
  );
  
  const imageData = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
  imageData.data.set(pixelData);
  ctx.putImageData(imageData, 0, 0);
}

function animationLoop(timestamp) {
  if (!animationState.isRunning) return;

  if (animationState.needsRedraw || dragState.isDragging) {
    renderInterference();
    animationState.needsRedraw = false;
    animationState.frameCount++;
  }

  animationState.lastFrameTime = timestamp;
  animationState.animationId = requestAnimationFrame(animationLoop);
}

function startAnimation() {
  if (animationState.isRunning) return;
  
  animationState.isRunning = true;
  animationState.needsRedraw = true;
  animationState.animationId = requestAnimationFrame(animationLoop);
  console.log('动画已启动');
}

function stopAnimation() {
  if (!animationState.isRunning) return;
  
  if (animationState.animationId) {
    cancelAnimationFrame(animationState.animationId);
    animationState.animationId = null;
  }
  
  animationState.isRunning = false;
  console.log('动画已暂停');
}

function handleVisibilityChange() {
  if (document.hidden) {
    console.log('页面隐藏，暂停动画');
    stopAnimation();
  } else {
    console.log('页面可见，恢复动画');
    startAnimation();
  }
}

function initVisibilityListener() {
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('webkitvisibilitychange', handleVisibilityChange);
}

function updateSourcePosition(clientX, clientY) {
  const canvasRect = canvas.getBoundingClientRect();
  let x = clientX - canvasRect.left - dragState.offsetX - 20;
  let y = clientY - canvasRect.top - dragState.offsetY - 20;

  x = Math.max(0, Math.min(CANVAS_WIDTH, x));
  y = Math.max(0, Math.min(CANVAS_HEIGHT, y));

  sources[dragState.source].x = x + 20;
  sources[dragState.source].y = y + 20;

  const sourceEl = dragState.source === 'source1' ? source1El : source2El;
  sourceEl.style.left = x + 'px';
  sourceEl.style.top = y + 'px';
  
  scheduleRedraw();
}

function initDragListeners() {
  [source1El, source2El].forEach((el, index) => {
    el.addEventListener('mousedown', (e) => {
      dragState.isDragging = true;
      dragState.source = index === 0 ? 'source1' : 'source2';
      const rect = el.getBoundingClientRect();
      dragState.offsetX = e.clientX - rect.left - 20;
      dragState.offsetY = e.clientY - rect.top - 20;
    });

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) {
        dragState.isDragging = false;
        return;
      }
      
      e.preventDefault();
      dragState.isDragging = true;
      dragState.source = index === 0 ? 'source1' : 'source2';
      const rect = el.getBoundingClientRect();
      const touch = e.touches[0];
      dragState.offsetX = touch.clientX - rect.left - 20;
      dragState.offsetY = touch.clientY - rect.top - 20;
    }, { passive: false });
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragState.isDragging) return;
    updateSourcePosition(e.clientX, e.clientY);
  });

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) {
      dragState.isDragging = false;
      return;
    }
    
    if (!dragState.isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateSourcePosition(touch.clientX, touch.clientY);
  }, { passive: false });

  document.addEventListener('mouseup', () => {
    dragState.isDragging = false;
    dragState.source = null;
    scheduleRedraw();
  });

  document.addEventListener('touchend', () => {
    dragState.isDragging = false;
    dragState.source = null;
    scheduleRedraw();
  });

  document.addEventListener('touchcancel', () => {
    dragState.isDragging = false;
    dragState.source = null;
    scheduleRedraw();
  });
}

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound() {
  initAudio();
  
  if (isPlaying) return;

  if (oscillator1) {
    try { oscillator1.stop(); oscillator1.disconnect(); } catch(e) {}
  }
  if (oscillator2) {
    try { oscillator2.stop(); oscillator2.disconnect(); } catch(e) {}
  }
  if (gainNode1) { try { gainNode1.disconnect(); } catch(e) {} }
  if (gainNode2) { try { gainNode2.disconnect(); } catch(e) {} }

  oscillator1 = audioContext.createOscillator();
  oscillator2 = audioContext.createOscillator();
  gainNode1 = audioContext.createGain();
  gainNode2 = audioContext.createGain();

  oscillator1.type = 'sine';
  oscillator2.type = 'sine';
  
  oscillator1.frequency.value = sources.source1.frequency;
  oscillator2.frequency.value = sources.source2.frequency;
  
  gainNode1.gain.value = sources.source1.amplitude * 0.3;
  gainNode2.gain.value = sources.source2.amplitude * 0.3;

  oscillator1.connect(gainNode1);
  oscillator2.connect(gainNode2);
  gainNode1.connect(audioContext.destination);
  gainNode2.connect(audioContext.destination);

  oscillator1.start();
  oscillator2.start();
  
  isPlaying = true;
}

function stopSound() {
  if (!isPlaying) return;
  
  const stopTime = audioContext.currentTime + 0.1;
  
  if (gainNode1) {
    gainNode1.gain.setValueAtTime(gainNode1.gain.value, audioContext.currentTime);
    gainNode1.gain.linearRampToValueAtTime(0, stopTime);
  }
  if (gainNode2) {
    gainNode2.gain.setValueAtTime(gainNode2.gain.value, audioContext.currentTime);
    gainNode2.gain.linearRampToValueAtTime(0, stopTime);
  }
  
  setTimeout(() => {
    if (oscillator1) {
      try { oscillator1.stop(); oscillator1.disconnect(); } catch(e) {}
      oscillator1 = null;
    }
    if (oscillator2) {
      try { oscillator2.stop(); oscillator2.disconnect(); } catch(e) {}
      oscillator2 = null;
    }
    if (gainNode1) { try { gainNode1.disconnect(); } catch(e) {} gainNode1 = null; }
    if (gainNode2) { try { gainNode2.disconnect(); } catch(e) {} gainNode2 = null; }
  }, 150);
  
  isPlaying = false;
}

function updateFrequency(source, value) {
  sources[source].frequency = parseFloat(value);
  if (source === 'source1') {
    freq1Value.textContent = value;
    if (oscillator1) {
      oscillator1.frequency.setValueAtTime(sources.source1.frequency, audioContext.currentTime);
    }
  } else {
    freq2Value.textContent = value;
    if (oscillator2) {
      oscillator2.frequency.setValueAtTime(sources.source2.frequency, audioContext.currentTime);
    }
  }
  updateBeatFrequency();
  scheduleRedraw();
}

function updateAmplitude(source, value) {
  sources[source].amplitude = parseFloat(value);
  if (source === 'source1') {
    amp1Value.textContent = value;
    if (gainNode1) {
      gainNode1.gain.setValueAtTime(value * 0.3, audioContext.currentTime);
    }
  } else {
    amp2Value.textContent = value;
    if (gainNode2) {
      gainNode2.gain.setValueAtTime(value * 0.3, audioContext.currentTime);
    }
  }
  scheduleRedraw();
}

function updateBeatFrequency() {
  const beat = Math.abs(sources.source1.frequency - sources.source2.frequency);
  beatFrequencyEl.textContent = beat.toFixed(1);
}

async function loadConfigs() {
  try {
    const response = await fetch('/api/configs');
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || '加载配置失败');
    }
    
    configList.innerHTML = '';
    result.data.configs.forEach(config => {
      const option = document.createElement('option');
      option.value = config.id;
      option.textContent = config.name;
      configList.appendChild(option);
    });
  } catch (error) {
    console.error('加载配置失败:', error);
  }
}

async function saveConfig() {
  const name = configNameInput.value.trim();
  if (!name) {
    alert('请输入配置名称');
    return;
  }

  const configData = {
    name: name,
    source1_x: sources.source1.x,
    source1_y: sources.source1.y,
    source1_frequency: sources.source1.frequency,
    source1_amplitude: sources.source1.amplitude,
    source2_x: sources.source2.x,
    source2_y: sources.source2.y,
    source2_frequency: sources.source2.frequency,
    source2_amplitude: sources.source2.amplitude
  };

  try {
    const response = await fetch('/api/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData)
    });
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || '保存配置失败');
    }
    
    await loadConfigs();
    alert('配置保存成功');
  } catch (error) {
    console.error('保存配置失败:', error);
    alert(error.message || '保存配置失败');
  }
}

async function loadConfig() {
  const selectedId = configList.value;
  if (!selectedId) {
    alert('请选择一个配置');
    return;
  }

  try {
    const response = await fetch(`/api/configs/${selectedId}`);
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error(result.message || '加载配置失败');
    }
    
    const config = result.data.config;

    sources.source1.x = config.source1_x;
    sources.source1.y = config.source1_y;
    sources.source1.frequency = config.source1_frequency;
    sources.source1.amplitude = config.source1_amplitude;
    sources.source2.x = config.source2_x;
    sources.source2.y = config.source2_y;
    sources.source2.frequency = config.source2_frequency;
    sources.source2.amplitude = config.source2_amplitude;

    frequency1Input.value = config.source1_frequency;
    frequency2Input.value = config.source2_frequency;
    amplitude1Input.value = config.source1_amplitude;
    amplitude2Input.value = config.source2_amplitude;
    freq1Value.textContent = config.source1_frequency;
    freq2Value.textContent = config.source2_frequency;
    amp1Value.textContent = config.source1_amplitude;
    amp2Value.textContent = config.source2_amplitude;

    source1El.style.left = (config.source1_x - 20) + 'px';
    source1El.style.top = (config.source1_y - 20) + 'px';
    source2El.style.left = (config.source2_x - 20) + 'px';
    source2El.style.top = (config.source2_y - 20) + 'px';

    updateBeatFrequency();
    configNameInput.value = config.name;

    if (isPlaying && oscillator1 && oscillator2 && audioContext) {
      const now = audioContext.currentTime;
      oscillator1.frequency.setValueAtTime(sources.source1.frequency, now);
      oscillator2.frequency.setValueAtTime(sources.source2.frequency, now);
      if (gainNode1) gainNode1.gain.setValueAtTime(sources.source1.amplitude * 0.3, now);
      if (gainNode2) gainNode2.gain.setValueAtTime(sources.source2.amplitude * 0.3, now);
    }

    scheduleRedraw();
    alert('配置加载成功');
  } catch (error) {
    console.error('加载配置失败:', error);
    alert(error.message || '加载配置失败');
  }
}

function initEventListeners() {
  frequency1Input.addEventListener('input', (e) => updateFrequency('source1', e.target.value));
  frequency2Input.addEventListener('input', (e) => updateFrequency('source2', e.target.value));
  amplitude1Input.addEventListener('input', (e) => updateAmplitude('source1', e.target.value));
  amplitude2Input.addEventListener('input', (e) => updateAmplitude('source2', e.target.value));

  playBtn.addEventListener('click', playSound);
  stopBtn.addEventListener('click', stopSound);
  saveBtn.addEventListener('click', saveConfig);
  loadBtn.addEventListener('click', loadConfig);
}

function getPerformanceInfo() {
  return {
    isAnimationRunning: animationState.isRunning,
    frameCount: animationState.frameCount,
    pageVisible: !document.hidden,
    isDragging: dragState.isDragging
  };
}

function init() {
  initDragListeners();
  initEventListeners();
  initVisibilityListener();
  loadConfigs();
  startAnimation();
  
  console.log('声音干涉图案合成器已启动');
  console.log('波计算模块已加载:', typeof WaveCalculator !== 'undefined');
}

window.addEventListener('beforeunload', () => {
  stopAnimation();
  stopSound();
});

init();
