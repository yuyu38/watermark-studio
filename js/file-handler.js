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
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            link.target = '_blank';
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                    <head><title>保存图片</title></head>
                    <body style="margin:0;padding:20px;text-align:center;font-family:sans-serif;">
                        <p style="margin-bottom:20px;">长按图片保存到相册</p>
                        <img src="${link.href}" style="max-width:100%;border:1px solid #ddd;" />
                        <p style="margin-top:20px;color:#666;font-size:12px;">提示：iOS不支持自动下载，请长按图片后选择"存储图像"</p>
                    </body>
                    </html>
                `);
                newWindow.document.close();
            } else {
                throw new Error('弹出窗口被阻止');
            }
        } else {
            link.click();
        }
        
        URL.revokeObjectURL(link.href);
        return true;
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
        
        if (isIOS) {
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                    <head><title>复制图片</title></head>
                    <body style="margin:0;padding:20px;text-align:center;font-family:sans-serif;">
                        <p style="margin-bottom:20px;">长按图片复制到剪贴板</p>
                        <img src="${URL.createObjectURL(imageBlob)}" style="max-width:100%;border:1px solid #ddd;" />
                        <p style="margin-top:20px;color:#666;font-size:12px;">提示：长按图片后选择"拷贝"</p>
                    </body>
                    </html>
                `);
                newWindow.document.close();
                return true;
            } else {
                throw new Error('弹出窗口被阻止');
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
            try {
                const textarea = document.createElement('textarea');
                textarea.value = '图片已生成，请截图后复制';
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                throw new Error('不支持剪贴板图片复制');
            } catch (fallbackError) {
                return false;
            }
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
