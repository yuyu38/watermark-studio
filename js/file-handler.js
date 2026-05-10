/**
 * 文件处理模块
 * 负责文件选择、加载和保存操作
 */

class FileHandler {
    constructor(bridge) {
        this.bridge = bridge;
        this.fileInput = null;
        this.cameraInput = null;
        this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        this.maxFileSize = 10 * 1024 * 1024;
    }

    /**
     * 初始化文件输入元素
     * @param {HTMLInputElement} fileInput - 文件选择 input
     * @param {HTMLInputElement} cameraInput - 相机 input
     */
    init(fileInput, cameraInput) {
        this.fileInput = fileInput;
        this.cameraInput = cameraInput;
    }

    /**
     * 从相册选择图片
     * @returns {Promise<Blob>}
     */
    async selectFromGallery() {
        if (this.bridge.isHarmonyOS) {
            const result = await this.bridge.pickImage();
            if (result.success) {
                const response = await fetch(result.data);
                return await response.blob();
            }
        }
        
        return new Promise((resolve, reject) => {
            if (!this.fileInput) {
                reject(new Error('File input not initialized'));
                return;
            }
            
            const handleFile = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!this.supportedFormats.includes(file.type)) {
                        reject(new Error('不支持的图片格式'));
                        return;
                    }
                    
                    if (file.size > this.maxFileSize) {
                        reject(new Error('图片文件过大（最大支持 10MB）'));
                        return;
                    }
                    
                    resolve(file);
                }
                
                this.fileInput.removeEventListener('change', handleFile);
            };
            
            this.fileInput.addEventListener('change', handleFile);
            this.fileInput.click();
        });
    }

    /**
     * 调用相机拍照
     * @returns {Promise<Blob>}
     */
    async captureFromCamera() {
        if (this.bridge.isHarmonyOS) {
            const result = await this.bridge.takePhoto();
            if (result.success) {
                const response = await fetch(result.data);
                return await response.blob();
            }
        }
        
        return new Promise((resolve, reject) => {
            if (!this.cameraInput) {
                reject(new Error('Camera input not initialized'));
                return;
            }
            
            const handleFile = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!this.supportedFormats.includes(file.type)) {
                        reject(new Error('不支持的图片格式'));
                        return;
                    }
                    
                    if (file.size > this.maxFileSize) {
                        reject(new Error('图片文件过大（最大支持 10MB）'));
                        return;
                    }
                    
                    resolve(file);
                }
                
                this.cameraInput.removeEventListener('change', handleFile);
            };
            
            this.cameraInput.addEventListener('change', handleFile);
            this.cameraInput.click();
        });
    }

    /**
     * 保存图片到相册
     * @param {Blob} imageBlob - 图片数据
     * @returns {Promise<boolean>}
     */
    async saveToGallery(imageBlob) {
        if (this.bridge.isHarmonyOS) {
            const result = await this.bridge.saveImage(imageBlob);
            if (result.success) {
                return true;
            }
        }
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(imageBlob);
        link.download = `watermarked_${Date.now()}.png`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        return true;
    }

    /**
     * 复制图片到剪贴板
     * @param {Blob} imageBlob - 图片数据
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(imageBlob) {
        if (this.bridge.isHarmonyOS) {
            const result = await this.bridge.copyImage(imageBlob);
            if (result.success) {
                return true;
            }
        }
        
        try {
            const item = new ClipboardItem({
                [imageBlob.type]: imageBlob
            });
            await navigator.clipboard.write([item]);
            return true;
        } catch (error) {
            console.error('Copy to clipboard failed:', error);
            return false;
        }
    }

    /**
     * 验证图片文件
     * @param {File} file - 文件对象
     * @returns {{valid: boolean, error?: string}}
     */
    validateImage(file) {
        if (!this.supportedFormats.includes(file.type)) {
            return { valid: false, error: '不支持的图片格式，请选择 JPG、PNG 或 WebP 格式' };
        }
        
        if (file.size > this.maxFileSize) {
            return { valid: false, error: '图片文件过大，请选择小于 10MB 的图片' };
        }
        
        return { valid: true };
    }

    /**
     * 创建图片预览 URL
     * @param {Blob} blob - 图片数据
     * @returns {string} 预览 URL
     */
    createPreviewURL(blob) {
        return URL.createObjectURL(blob);
    }

    /**
     * 释放预览 URL
     * @param {string} url - 预览 URL
     */
    revokePreviewURL(url) {
        URL.revokeObjectURL(url);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
}
