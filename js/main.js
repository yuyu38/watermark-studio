/**
 * 水印工坊 - 主逻辑入口
 * 负责协调各模块，管理用户交互
 */

class WatermarkApp {
    constructor() {
        this.engine = null;
        this.fileHandler = null;
        this.bridge = null;
        this.isExporting = false;
        this.currentImageBlob = null;
        this.landscapeBreakpoint = 768;
    }

    /**
     * 初始化应用
     */
    init() {
        this.bridge = new HarmonyBridge();
        this.engine = new WatermarkEngine(document.getElementById('previewCanvas'));
        this.fileHandler = new FileHandler(this.bridge);

        const fileInput = document.getElementById('fileInput');
        const cameraInput = document.getElementById('cameraInput');
        this.fileHandler.init(fileInput, cameraInput);

        this.bindEvents();
        this.loadLastConfig();
        this.setupResponsiveLayout();
    }

    /**
     * 设置响应式布局
     */
    setupResponsiveLayout() {
        this.updateLayout();
        window.addEventListener('resize', () => this.updateLayout());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.updateLayout(), 100);
        });
    }

    /**
     * 检测是否为横屏模式 - 基于长宽比判断
     */
    isLandscapeMode() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        return width > height;
    }

    /**
     * 更新布局
     */
    updateLayout() {
        const container = document.querySelector('.app-container');
        const previewSection = document.querySelector('.preview-section');
        const controlsSection = document.querySelector('.controls-section');

        if (this.isLandscapeMode()) {
            container.classList.add('landscape-mode');
            container.classList.remove('portrait-mode');
            previewSection.classList.add('landscape');
            controlsSection.classList.add('landscape');
        } else {
            container.classList.remove('landscape-mode');
            container.classList.add('portrait-mode');
            previewSection.classList.remove('landscape');
            controlsSection.classList.remove('landscape');
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        document.getElementById('selectImageBtn').addEventListener('click', () => this.selectImage());
        document.getElementById('saveToGalleryBtn').addEventListener('click', () => this.saveToGallery());
        document.getElementById('copyToClipboardBtn').addEventListener('click', () => this.copyToClipboard());
        
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.dataset.mode;
                this.switchLayoutMode(mode);
                this.saveConfig();
            });
        });
        
        document.getElementById('watermarkText').addEventListener('input', (e) => {
            this.updateWatermarkConfig({ text: e.target.value || '水印文字' });
            this.saveConfig();
        });
        
        document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('fontSizeValue').textContent = `${value}px`;
            this.updateWatermarkConfig({ fontSize: value });
            this.saveConfig();
        });
        
        document.getElementById('tiledFontSizeSlider').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('tiledFontSizeValue').textContent = `${value}px`;
            this.updateWatermarkConfig({ tiledFontSize: value });
            this.saveConfig();
        });
        
        document.getElementById('opacitySlider').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const opacity = value / 100;
            document.getElementById('opacityValue').textContent = `${value}%`;
            this.updateWatermarkConfig({ opacity: opacity });
            this.saveConfig();
        });
        
        document.getElementById('spacingSlider').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('spacingValue').textContent = `${value}px`;
            this.updateWatermarkConfig({ tiledSpacing: value });
            this.saveConfig();
        });
        
        document.getElementById('rotationSlider').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('rotationValue').textContent = `${value}°`;
            this.updateWatermarkConfig({ tiledRotation: value });
            this.saveConfig();
        });
        
        document.getElementById('watermarkColor').addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('colorValue').textContent = value;
            this.updateWatermarkConfig({ color: value });
            this.saveConfig();
        });
        
        const positionButtons = document.querySelectorAll('.position-btn');
        positionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                positionButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateWatermarkConfig({ position: btn.dataset.position });
                this.saveConfig();
            });
        });
    }

    /**
     * 切换布局模式
     * @param {string} mode - 布局模式 ('single' | 'tiled')
     */
    switchLayoutMode(mode) {
        const singleControls = document.getElementById('singleModeControls');
        const tiledControls = document.getElementById('tiledModeControls');
        const singlePosition = document.getElementById('singlePositionSection');
        const tiledSpacing = document.getElementById('tiledSpacingSection');
        const tiledRotation = document.getElementById('tiledRotationSection');
        
        if (mode === 'single') {
            singleControls.style.display = 'block';
            singlePosition.style.display = 'block';
            tiledControls.style.display = 'none';
            tiledSpacing.style.display = 'none';
            tiledRotation.style.display = 'none';
        } else {
            singleControls.style.display = 'none';
            singlePosition.style.display = 'none';
            tiledControls.style.display = 'block';
            tiledSpacing.style.display = 'block';
            tiledRotation.style.display = 'block';
        }
        
        this.updateWatermarkConfig({ layoutMode: mode });
    }

    /**
     * 选择图片
     */
    async selectImage() {
        try {
            const blob = await this.fileHandler.selectFromGallery();
            await this.loadImage(blob);
            this.showToast('图片加载成功', 'success');
        } catch (error) {
            if (error.message !== 'No file selected') {
                this.showToast(error.message, 'error');
            }
        }
    }

    /**
     * 拍照
     */
    async takePhoto() {
        try {
            const blob = await this.fileHandler.captureFromCamera();
            await this.loadImage(blob);
            this.showToast('照片拍摄成功', 'success');
        } catch (error) {
            if (error.message !== 'No file selected') {
                this.showToast(error.message, 'error');
            }
        }
    }

    /**
     * 加载图片
     * @param {Blob} blob - 图片数据
     */
    async loadImage(blob) {
        try {
            this.currentImageBlob = blob;
            await this.engine.loadImage(blob);
            
            document.getElementById('placeholder').style.display = 'none';
            document.getElementById('previewCanvas').classList.add('active');
            
            const saveBtn = document.getElementById('saveToGalleryBtn');
            const copyBtn = document.getElementById('copyToClipboardBtn');
            saveBtn.classList.remove('disabled');
            saveBtn.disabled = false;
            copyBtn.classList.remove('disabled');
            copyBtn.disabled = false;
            
            this.renderPreview();
        } catch (error) {
            this.showToast('图片加载失败', 'error');
            console.error('Image load error:', error);
        }
    }

    /**
     * 更新水印配置
     * @param {Object} config - 新配置
     */
    updateWatermarkConfig(config) {
        if (this.engine.hasImage()) {
            this.engine.updateConfig(config);
        } else {
            this.engine.updateConfig(config);
        }
    }

    /**
     * 渲染预览
     */
    renderPreview() {
        if (this.engine.hasImage()) {
            this.engine.render();
        }
    }

    /**
     * 保存到相册
     */
    async saveToGallery() {
        if (this.isExporting || !this.engine.hasImage()) {
            return;
        }
        
        this.isExporting = true;
        const btn = document.getElementById('saveToGalleryBtn');
        btn.classList.add('loading');
        btn.disabled = true;
        
        try {
            const blob = await this.engine.exportImage('png', 0.92);
            await this.fileHandler.saveToGallery(blob);
            this.showToast('图片已保存到相册', 'success');
        } catch (error) {
            this.showToast('保存失败，请重试', 'error');
            console.error('Save error:', error);
        } finally {
            this.isExporting = false;
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    /**
     * 复制到剪贴板
     */
    async copyToClipboard() {
        if (this.isExporting || !this.engine.hasImage()) {
            return;
        }
        
        this.isExporting = true;
        const btn = document.getElementById('copyToClipboardBtn');
        btn.classList.add('loading');
        btn.disabled = true;
        
        try {
            const blob = await this.engine.exportImage('png', 0.92);
            const success = await this.fileHandler.copyToClipboard(blob);
            
            if (success) {
                this.showToast('图片已复制到剪贴板', 'success');
            } else {
                this.showToast('复制失败，请检查浏览器权限', 'error');
            }
        } catch (error) {
            this.showToast('复制失败，请重试', 'error');
            console.error('Copy error:', error);
        } finally {
            this.isExporting = false;
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    /**
     * 保存配置到本地存储
     */
    saveConfig() {
        const config = this.engine.getConfig();
        try {
            localStorage.setItem('watermarkConfig', JSON.stringify(config));
        } catch (error) {
            console.warn('Failed to save config:', error);
        }
    }

    /**
     * 加载上次保存的配置
     */
    loadLastConfig() {
        const defaultText = '该证件仅供XX查看，不得他用';
        
        this.engine.updateConfig({ text: defaultText });
        document.getElementById('watermarkText').value = defaultText;
        
        document.getElementById('fontSizeSlider').value = 200;
        document.getElementById('fontSizeValue').textContent = '200px';
        
        document.getElementById('opacitySlider').value = 100;
        document.getElementById('opacityValue').textContent = '100%';
        
        document.getElementById('watermarkColor').value = '#ffffff';
        document.getElementById('colorValue').textContent = '#ffffff';
        
        document.getElementById('tiledFontSizeSlider').value = 80;
        document.getElementById('tiledFontSizeValue').textContent = '80px';
        
        document.getElementById('spacingSlider').value = 200;
        document.getElementById('spacingValue').textContent = '200px';
        
        document.getElementById('rotationSlider').value = 40;
        document.getElementById('rotationValue').textContent = '40°';
        
        const layoutMode = 'tiled';
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === layoutMode) {
                btn.classList.add('active');
            }
        });
        this.switchLayoutMode(layoutMode);
    }

    /**
     * 显示提示信息
     * @param {string} message - 提示内容
     * @param {string} type - 提示类型 ('success' | 'error' | 'info')
     */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = toast.querySelector('.toast-message');
        
        toast.className = 'toast';
        toastMessage.textContent = message;
        toast.classList.add(type);
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new WatermarkApp();
    app.init();
});
