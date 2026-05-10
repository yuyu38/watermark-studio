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
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            return await this.saveToGalleryiOS(imageBlob);
        }
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(imageBlob);
        link.download = `watermarked_${Date.now()}.png`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        return true;
    }

    /**
     * iOS专用保存方法 - 使用Canvas转换后通过img标签保存
     */
    async saveToGalleryiOS(imageBlob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const dataURL = canvas.toDataURL('image/png', 1.0);
                
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.95);
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    box-sizing: border-box;
                `;
                
                const title = document.createElement('p');
                title.textContent = '长按图片保存到相册';
                title.style.cssText = 'color: white; font-size: 18px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;';
                
                const saveImg = document.createElement('img');
                saveImg.src = dataURL;
                saveImg.style.cssText = 'max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);';
                
                const hint = document.createElement('p');
                hint.textContent = '提示：iOS请长按图片，选择"存储图像"或"添加到照片"';
                hint.style.cssText = 'color: #aaa; font-size: 13px; margin-top: 20px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, sans-serif;';
                
                const closeBtn = document.createElement('button');
                closeBtn.textContent = '关闭';
                closeBtn.style.cssText = `
                    margin-top: 20px;
                    padding: 10px 30px;
                    background: #007AFF;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                `;
                closeBtn.onclick = () => overlay.remove();
                
                overlay.appendChild(title);
                overlay.appendChild(saveImg);
                overlay.appendChild(hint);
                overlay.appendChild(closeBtn);
                
                overlay.onclick = (e) => {
                    if (e.target === overlay) overlay.remove();
                };
                
                document.body.appendChild(overlay);
                resolve(true);
            };
            
            img.onerror = () => {
                reject(new Error('图片处理失败'));
            };
            
            img.src = URL.createObjectURL(imageBlob);
        });
    }

    /**
     * 显示提示信息（供file-handler内部使用）
     */
    showToast(message, type) {
        if (this.bridge.showToast) {
            this.bridge.showToast(message, type);
        }
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
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS || !navigator.clipboard || !window.ClipboardItem) {
            return await this.showCopyGuideiOS(imageBlob);
        }
        
        try {
            const item = new ClipboardItem({
                [imageBlob.type]: imageBlob
            });
            await navigator.clipboard.write([item]);
            return true;
        } catch (error) {
            console.error('Copy to clipboard failed:', error);
            return await this.showCopyGuideiOS(imageBlob);
        }
    }

    /**
     * iOS复制引导 - 显示图片并提示用户手动复制
     */
    async showCopyGuideiOS(imageBlob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const dataURL = canvas.toDataURL('image/png', 1.0);
                
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.95);
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    box-sizing: border-box;
                `;
                
                const title = document.createElement('p');
                title.textContent = '复制图片到剪贴板';
                title.style.cssText = 'color: white; font-size: 18px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;';
                
                const copyImg = document.createElement('img');
                copyImg.src = dataURL;
                copyImg.style.cssText = 'max-width: 100%; max-height: 65vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);';
                
                const hint = document.createElement('p');
                hint.innerHTML = 'iOS不支持自动复制<br>请长按图片，选择"拷贝"后粘贴使用<br>或截图后手动复制';
                hint.style.cssText = 'color: #aaa; font-size: 13px; margin-top: 20px; text-align: center; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, sans-serif;';
                
                const closeBtn = document.createElement('button');
                closeBtn.textContent = '关闭';
                closeBtn.style.cssText = `
                    margin-top: 20px;
                    padding: 10px 30px;
                    background: #007AFF;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                `;
                closeBtn.onclick = () => {
                    overlay.remove();
                    resolve(true);
                };
                
                overlay.appendChild(title);
                overlay.appendChild(copyImg);
                overlay.appendChild(hint);
                overlay.appendChild(closeBtn);
                
                overlay.onclick = (e) => {
                    if (e.target === overlay) {
                        overlay.remove();
                        resolve(true);
                    }
                };
                
                document.body.appendChild(overlay);
            };
            
            img.onerror = () => {
                reject(new Error('图片处理失败'));
            };
            
            img.src = URL.createObjectURL(imageBlob);
        });
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
