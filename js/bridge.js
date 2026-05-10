/**
 * 鸿蒙原生 Bridge 封装
 * 负责与原生系统通信
 */

class HarmonyBridge {
    constructor() {
        this.isHarmonyOS = typeof harmony !== 'undefined';
    }

    /**
     * 选择图片（从相册）
     * @returns {Promise<{success: boolean, data?: string, error?: string}>}
     */
    async pickImage() {
        if (this.isHarmonyOS && harmony.pickImage) {
            try {
                const result = await harmony.pickImage();
                return { success: true, data: result };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
        
        return { success: false, error: 'Native API not available' };
    }

    /**
     * 拍照获取图片
     * @returns {Promise<{success: boolean, data?: string, error?: string}>}
     */
    async takePhoto() {
        if (this.isHarmonyOS && harmony.takePhoto) {
            try {
                const result = await harmony.takePhoto();
                return { success: true, data: result };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
        
        return { success: false, error: 'Native API not available' };
    }

    /**
     * 保存图片到相册
     * @param {Blob|string} imageData - 图片数据
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async saveImage(imageData) {
        if (this.isHarmonyOS && harmony.saveImage) {
            try {
                await harmony.saveImage(imageData);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
        
        return { success: false, error: 'Native API not available' };
    }

    /**
     * 复制图片到剪贴板
     * @param {Blob|string} imageData - 图片数据
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async copyImage(imageData) {
        if (this.isHarmonyOS && harmony.copyImage) {
            try {
                await harmony.copyImage(imageData);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
        
        return { success: false, error: 'Native API not available' };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HarmonyBridge;
}
