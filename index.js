// Options matching the sliders
const samplingOptions = [1, 2, 4, 8, 16, 32, 64];
const quantizationOptions = [2, 4, 8, 16, 256];

// State
let activeImageSrc = 'https://picsum.photos/id/1018/512/512';
let activeSampling = 1;
let activeQuantization = 256;
let isEncodingView = false;

// Cached original image object & data
let imgElement = new Image();
imgElement.crossOrigin = 'anonymous';

// Offscreen canvas to hold original image data securely for fast pixel access
const offscreenCanvas = document.createElement('canvas');
const offCtx = offscreenCanvas.getContext('2d');

// DOM Elements
const canvas = document.getElementById('image-canvas');
const ctx = canvas.getContext('2d');
const samplingSlider = document.getElementById('sampling-slider');
const quantizationSlider = document.getElementById('quantization-slider');
const samplingVal = document.getElementById('sampling-val');
const quantizationVal = document.getElementById('quantization-val');
const toggleViewBtn = document.getElementById('toggle-view-btn');
const explanationPanel = document.getElementById('explanation-panel');
const dataViewerPanel = document.getElementById('data-viewer-panel');
const viewToggleHelper = document.getElementById('view-toggle-helper');
const fileUploadBtn = document.getElementById('file-upload-btn');
const fileUploadInput = document.getElementById('file-upload-input');

// Sim Elements
const estimatedSizeEl = document.getElementById('estimated-size');
const sizeReductionTag = document.getElementById('size-reduction-tag');
const reductionPercentEl = document.getElementById('reduction-percent');
const originalSizeLabel = document.getElementById('original-size-label');
const currentSizeLabel = document.getElementById('current-size-label');
const sizeRatioBar = document.getElementById('size-ratio-bar');

// Calc Elements
const calcPixelsEl = document.getElementById('calc-pixels');
const calcColorDepthEl = document.getElementById('calc-color-depth');
const calcTotalBitsEl = document.getElementById('calc-total-bits');
const calcBytesEl = document.getElementById('calc-bytes');

// Overlays
const overlaySampling = document.getElementById('overlay-sampling');
const overlayQuantization = document.getElementById('overlay-quantization');
const overlayBits = document.getElementById('overlay-bits');

// Tooltip Elements
const pixelTooltip = document.getElementById('pixel-tooltip');
const tooltipColorPreview = document.getElementById('tooltip-color-preview');
const tooltipX = document.getElementById('tooltip-x');
const tooltipY = document.getElementById('tooltip-y');
const tooltipR = document.getElementById('tooltip-r');
const tooltipG = document.getElementById('tooltip-g');
const tooltipB = document.getElementById('tooltip-b');
const tooltipBinR = document.getElementById('tooltip-bin-r');
const tooltipBinG = document.getElementById('tooltip-bin-g');
const tooltipBinB = document.getElementById('tooltip-bin-b');

// Data Viewer Hover Elements
const dataHoverActive = document.getElementById('data-hover-active');
const dataHoverEmpty = document.getElementById('data-hover-empty');
const dataHoverColorPreview = document.getElementById('data-hover-color-preview');
const dataX = document.getElementById('data-x');
const dataY = document.getElementById('data-y');
const dataR = document.getElementById('data-r');
const dataG = document.getElementById('data-g');
const dataB = document.getElementById('data-b');
const dataBinR = document.getElementById('data-bin-r');
const dataBinG = document.getElementById('data-bin-g');
const dataBinB = document.getElementById('data-bin-b');
const encodingTableRows = document.getElementById('encoding-table-rows');

// Format byte strings beautifully
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

// Convert a color value (0-255) to a binary representation based on quantization levels
function toBinaryString(value, levels) {
  const bits = Math.ceil(Math.log2(levels));
  const step = 256 / levels;
  const levelIndex = Math.min(levels - 1, Math.floor(value / step));
  return levelIndex.toString(2).padStart(bits, '0');
}

// Perform pixel quantization
function quantizeValue(value, levels) {
  if (levels === 256) return value;
  const step = 256 / levels;
  const levelIndex = Math.floor(value / step);
  // Map to the midpoint of the quantized interval for better visual fidelity
  return Math.min(255, Math.floor((levelIndex + 0.5) * step));
}

// Initialize and setup Event Listeners
let isInitialized = false;
function init() {
  if (isInitialized) return;
  isInitialized = true;

  // Load Lucide icons initially
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Image load handler
  imgElement.onload = () => {
    // Set standard size to 256x256 to ensure consistent, highly interactive digitization grid
    // regardless of actual uploaded image resolution (keeps performance flawless and representative)
    offscreenCanvas.width = 256;
    offscreenCanvas.height = 256;
    offCtx.drawImage(imgElement, 0, 0, 256, 256);

    canvas.width = 256;
    canvas.height = 256;
    
    processAndRender();
  };

  // Trigger initial image load
  imgElement.src = activeImageSrc;

  // Set up Sample Image Buttons
  document.querySelectorAll('.sample-img-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Manage active classes
      document.querySelectorAll('.sample-img-btn').forEach(b => {
        b.classList.remove('border-blue-600', 'ring-2', 'ring-blue-100');
        b.classList.add('border-transparent');
      });
      const currentBtn = e.currentTarget;
      currentBtn.classList.remove('border-transparent');
      currentBtn.classList.add('border-blue-600', 'ring-2', 'ring-blue-100');

      const img = currentBtn.querySelector('img');
      if (img) {
        activeImageSrc = img.src;
        imgElement.src = activeImageSrc;
      }
    });
  });

  // Slider changes
  samplingSlider.addEventListener('input', (e) => {
    activeSampling = samplingOptions[parseInt(e.target.value)];
    updateSliderLabels();
    processAndRender();
  });

  quantizationSlider.addEventListener('input', (e) => {
    activeQuantization = quantizationOptions[parseInt(e.target.value)];
    updateSliderLabels();
    processAndRender();
  });

  // Upload button trigger
  fileUploadBtn.addEventListener('click', () => {
    fileUploadInput.click();
  });

  fileUploadInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          activeImageSrc = event.target.result;
          imgElement.src = activeImageSrc;

          // Remove sample images highlight
          document.querySelectorAll('.sample-img-btn').forEach(b => {
            b.classList.remove('border-blue-600', 'ring-2', 'ring-blue-100');
            b.classList.add('border-transparent');
          });
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // Toggle View
  toggleViewBtn.addEventListener('click', () => {
    isEncodingView = !isEncodingView;
    
    if (isEncodingView) {
      toggleViewBtn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200', 'hover:bg-slate-50');
      toggleViewBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
      toggleViewBtn.innerHTML = `<i data-lucide="binary" class="w-4 h-4"></i><span>符号化表示: ON</span>`;
    } else {
      toggleViewBtn.classList.add('bg-white', 'text-slate-700', 'border-slate-200', 'hover:bg-slate-50');
      toggleViewBtn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
      toggleViewBtn.innerHTML = `<i data-lucide="binary" class="w-4 h-4"></i><span>符号化表示: OFF</span>`;
    }
    
    if (window.lucide) {
      window.lucide.createIcons();
    }

    if (isEncodingView) {
      explanationPanel.classList.add('hidden');
      dataViewerPanel.classList.remove('hidden');
      viewToggleHelper.classList.remove('hidden');
    } else {
      explanationPanel.classList.remove('hidden');
      dataViewerPanel.classList.add('hidden');
      viewToggleHelper.classList.add('hidden');
    }
    
    renderEncodingTable();
  });

  // Canvas Mouse Move for Zoom/Detail Hover
  canvas.addEventListener('mousemove', handleCanvasHover);
  canvas.addEventListener('mouseleave', () => {
    pixelTooltip.classList.add('hidden');
    resetDataHoverInfo();
  });

  // Handle window resizing
  window.addEventListener('resize', () => {
    // Canvas is css-responsive via CSS max-width, so standard 256x256 holds up beautifully.
  });

  // Set initial labels
  updateSliderLabels();
}

// Update slider visual text
function updateSliderLabels() {
  // Sampling Label
  samplingVal.textContent = `${activeSampling} px`;

  // Quantization Label
  quantizationVal.textContent = `${activeQuantization} 階調`;

  // Overlay Labels
  const bits = Math.ceil(Math.log2(activeQuantization));
  overlaySampling.textContent = activeSampling;
  overlayQuantization.textContent = activeQuantization;
  overlayBits.textContent = bits;
}

// Main image sampling, quantization and rendering pipeline
function processAndRender() {
  const w = offscreenCanvas.width;
  const h = offscreenCanvas.height;

  // Read full original image data
  const origData = offCtx.getImageData(0, 0, w, h).data;
  
  // Create output buffer
  const outputImgData = ctx.createImageData(w, h);
  const out = outputImgData.data;

  // Process block by block
  const step = activeSampling;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      // Find representative pixel (top-left or center of block)
      // We will read top-left of each block for precise cell simulation
      const baseIdx = (y * w + x) * 4;
      
      const r = origData[baseIdx];
      const g = origData[baseIdx + 1];
      const b = origData[baseIdx + 2];

      // Quantize
      const qR = quantizeValue(r, activeQuantization);
      const qG = quantizeValue(g, activeQuantization);
      const qB = quantizeValue(b, activeQuantization);

      // Fill the entire step x step block with this quantized color in output buffer
      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          const py = y + dy;
          const px = x + dx;
          if (px < w && py < h) {
            const outIdx = (py * w + px) * 4;
            out[outIdx] = qR;
            out[outIdx + 1] = qG;
            out[outIdx + 2] = qB;
            out[outIdx + 3] = 255; // Alpha
          }
        }
      }
    }
  }

  // Draw buffer to visible canvas
  ctx.putImageData(outputImgData, 0, 0);

  // Update Data Simulation Stats
  updateDataSimulation();

  // If encoding list is visible, rebuild it
  if (isEncodingView) {
    renderEncodingTable();
  }
}

// Update Size Calculations dynamically
function updateDataSimulation() {
  const w = offscreenCanvas.width; // 256
  const h = offscreenCanvas.height; // 256
  
  // 1. Calculate actual grid dimension under current sampling
  const gridWidth = Math.ceil(w / activeSampling);
  const gridHeight = Math.ceil(h / activeSampling);
  const totalPixels = gridWidth * gridHeight;

  // 2. Quantization bit depth
  const bitsPerChannel = Math.ceil(Math.log2(activeQuantization));
  const totalBitsPerPixel = bitsPerChannel * 3;

  // 3. Sum data size
  const totalBits = totalPixels * totalBitsPerPixel;
  const estimatedBytes = Math.ceil(totalBits / 8);

  // 4. Baseline original size calculation (Sampling=1px, Quantization=256 levels)
  const originalSize = w * h * 3; // 256 * 256 * 3 bytes = 196,608 bytes

  // Update Text
  estimatedSizeEl.textContent = formatBytes(estimatedBytes);
  originalSizeLabel.textContent = `元: ${formatBytes(originalSize)}`;
  currentSizeLabel.textContent = `今回: ${formatBytes(estimatedBytes)}`;

  // Size reduction percentage
  const reductionPercent = originalSize > 0 ? ((1 - (estimatedBytes / originalSize)) * 100) : 0;
  if (reductionPercent > 0.1) {
    sizeReductionTag.classList.remove('hidden');
    reductionPercentEl.textContent = `-${reductionPercent.toFixed(1)}%`;
  } else {
    sizeReductionTag.classList.add('hidden');
  }

  // Ratio Bar Width
  const ratio = Math.max(2, (estimatedBytes / originalSize) * 100);
  sizeRatioBar.style.width = `${ratio}%`;

  // Update Calculation Box Formula Details
  calcPixelsEl.textContent = `${gridWidth} × ${gridHeight} ＝ ${totalPixels.toLocaleString()} px`;
  calcColorDepthEl.textContent = `${bitsPerChannel} bit × 3色 ＝ ${totalBitsPerPixel} bit`;
  calcTotalBitsEl.textContent = `${totalBits.toLocaleString()} bit`;
  calcBytesEl.textContent = `${estimatedBytes.toLocaleString()} B`;
}

// Handle pixel hover and extraction of coordinates and values
function handleCanvasHover(e) {
  const rect = canvas.getBoundingClientRect();
  
  // Calculate relative coordinate (0 - 256) inside our canvas resolution
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
    pixelTooltip.classList.add('hidden');
    return;
  }

  // Snap coordinate to active sampling block's origin
  const blockX = Math.floor(x / activeSampling) * activeSampling;
  const blockY = Math.floor(y / activeSampling) * activeSampling;

  // Fetch quantized pixel values directly from our output canvas
  const pixelData = ctx.getImageData(blockX, blockY, 1, 1).data;
  const r = pixelData[0];
  const g = pixelData[1];
  const b = pixelData[2];

  // Convert to binary
  const binR = toBinaryString(r, activeQuantization);
  const binG = toBinaryString(g, activeQuantization);
  const binB = toBinaryString(b, activeQuantization);

  // Position and show tooltip relative to canvas container
  const containerRect = document.getElementById('canvas-container').getBoundingClientRect();
  const tipX = e.clientX - containerRect.left + 15;
  const tipY = e.clientY - containerRect.top + 15;

  pixelTooltip.style.left = `${tipX}px`;
  pixelTooltip.style.top = `${tipY}px`;
  pixelTooltip.classList.remove('hidden');

  // Fill values in tooltip
  tooltipColorPreview.style.backgroundColor = `rgb(${r},${g},${b})`;
  tooltipX.textContent = blockX;
  tooltipY.textContent = blockY;
  tooltipR.textContent = r;
  tooltipG.textContent = g;
  tooltipB.textContent = b;
  tooltipBinR.textContent = binR;
  tooltipBinG.textContent = binG;
  tooltipBinB.textContent = binB;

  // Fill values in the Data Viewer right-side section if active
  if (isEncodingView) {
    dataHoverEmpty.classList.add('hidden');
    dataHoverActive.classList.remove('hidden');

    dataHoverColorPreview.style.backgroundColor = `rgb(${r},${g},${b})`;
    dataX.textContent = blockX;
    dataY.textContent = blockY;
    dataR.textContent = r;
    dataG.textContent = g;
    dataB.textContent = b;
    dataBinR.textContent = binR;
    dataBinG.textContent = binG;
    dataBinB.textContent = binB;

    // Highlight row in list if it's there
    document.querySelectorAll('.table-row-item').forEach(row => {
      if (row.dataset.coords === `${blockX},${blockY}`) {
        row.classList.add('bg-indigo-50', 'border-indigo-200');
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        row.classList.remove('bg-indigo-50', 'border-indigo-200');
      }
    });
  }
}

// Reset hover sidebar block back to empty/placeholder
function resetDataHoverInfo() {
  if (isEncodingView) {
    dataHoverActive.classList.add('hidden');
    dataHoverEmpty.classList.remove('hidden');

    document.querySelectorAll('.table-row-item').forEach(row => {
      row.classList.remove('bg-indigo-50', 'border-indigo-200');
    });
  }
}

// Render dynamic 4x4 grid list of block codes inside data viewer
function renderEncodingTable() {
  encodingTableRows.innerHTML = '';

  const w = offscreenCanvas.width; // 256
  const h = offscreenCanvas.height; // 256

  // We choose 16 representative points (4x4 grid across the image canvas)
  const steps = 4;
  const chunkX = w / steps;
  const chunkY = h / steps;

  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      // Find pixel coordinate corresponding to grid points
      const exactX = Math.floor((j + 0.5) * chunkX);
      const exactY = Math.floor((i + 0.5) * chunkY);

      // Snap coordinates to active block size
      const blockX = Math.floor(exactX / activeSampling) * activeSampling;
      const blockY = Math.floor(exactY / activeSampling) * activeSampling;

      // Extract pixel values
      const pixelData = ctx.getImageData(blockX, blockY, 1, 1).data;
      const r = pixelData[0];
      const g = pixelData[1];
      const b = pixelData[2];

      const binR = toBinaryString(r, activeQuantization);
      const binG = toBinaryString(g, activeQuantization);
      const binB = toBinaryString(b, activeQuantization);

      // Create row
      const row = document.createElement('div');
      row.className = 'table-row-item grid grid-cols-4 py-2 text-center items-center hover:bg-slate-50 transition-colors border-b border-slate-100 cursor-pointer';
      row.dataset.coords = `${blockX},${blockY}`;
      
      row.innerHTML = `
        <div class="font-bold text-slate-500">(${blockX},${blockY})</div>
        <div class="text-red-500 font-semibold">${binR}</div>
        <div class="text-green-600 font-semibold">${binG}</div>
        <div class="text-blue-500 font-semibold">${binB}</div>
      `;

      // Hover row updates canvas highlight or tooltip position slightly
      row.addEventListener('mouseenter', () => {
        row.classList.add('bg-indigo-50/50');
        // Update the hover info
        dataHoverEmpty.classList.add('hidden');
        dataHoverActive.classList.remove('hidden');
        dataHoverColorPreview.style.backgroundColor = `rgb(${r},${g},${b})`;
        dataX.textContent = blockX;
        dataY.textContent = blockY;
        dataR.textContent = r;
        dataG.textContent = g;
        dataB.textContent = b;
        dataBinR.textContent = binR;
        dataBinG.textContent = binG;
        dataBinB.textContent = binB;
      });

      row.addEventListener('mouseleave', () => {
        row.classList.remove('bg-indigo-50/50');
      });

      encodingTableRows.appendChild(row);
    }
  }
}

// Boot the application
document.addEventListener('DOMContentLoaded', init);
// Run in case DOMContentLoaded has already fired in full sandbox environment
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}
