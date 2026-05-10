/**
 * 水印渲染引擎
 * 负责在 Canvas 上绘制图片和水印
 */

class WatermarkEngine {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.originalImage = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        
        this.config = {
            text: '该证件仅供XX查看，不得他用',
            fontSize: 200,
            opacity: 1.0,
            position: 'middle-center',
            color: '#ffffff',
            padding: 150,
            layoutMode: 'tiled',
            tiledSpacing: 200,
            tiledRotation: 40,
            tiledFontSize: 80
        };
    }

    /**
     * 加载图片
     * @param {string|Blob} imageSource - 图片源（URL 或 Blob）
     * @returns {Promise<void>}
     */
    async loadImage(imageSource) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.originalImage = img;
                this.originalWidth = img.width;
                this.originalHeight = img.height;
                
                const maxWidth = 1200;
                const maxHeight = 800;
                
                let displayWidth = img.width;
                let displayHeight = img.height;
                
                const widthRatio = maxWidth / img.width;
                const heightRatio = maxHeight / img.height;
                const scaleRatio = Math.min(widthRatio, heightRatio, 1);
                
                if (scaleRatio < 1) {
                    displayWidth = Math.round(img.width * scaleRatio);
                    displayHeight = Math.round(img.height * scaleRatio);
                }
                
                this.canvas.width = displayWidth;
                this.canvas.height = displayHeight;
                
                this.render();
                resolve();
            };
            
            img.onerror = () => {
                reject(new Error('图片加载失败'));
            };
            
            if (typeof imageSource === 'string') {
                img.src = imageSource;
            } else {
                img.src = URL.createObjectURL(imageSource);
            }
        });
    }

    /**
     * 更新水印配置
     * @param {Object} newConfig - 新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.render();
    }

    /**
     * 获取配置
     * @returns {Object} 当前配置
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * 将文字拆分为多行（每行4-5个字）
     * @param {string} text - 原始文字
     * @param {number} charsPerLine - 每行字符数
     * @returns {string[]} 拆分后的行数组
     */
    wrapText(text, charsPerLine = 5) {
        const lines = [];
        for (let i = 0; i < text.length; i += charsPerLine) {
            lines.push(text.slice(i, i + charsPerLine));
        }
        return lines;
    }

    /**
     * 计算水印位置
     * @param {number} totalHeight - 水印总高度
     * @returns {{x: number, y: number}} 水印起始坐标
     */
    calculatePosition(totalHeight) {
        const { position, padding } = this.config;
        const canvasHeight = this.canvas.height;
        
        const adaptivePadding = Math.min(padding, Math.floor(canvasHeight * 0.1));
        
        let y = 0;
        
        const verticalPositions = {
            'top-left': adaptivePadding,
            'top-center': adaptivePadding,
            'top-right': adaptivePadding,
            'middle-left': (canvasHeight - totalHeight) / 2,
            'middle-center': (canvasHeight - totalHeight) / 2,
            'middle-right': (canvasHeight - totalHeight) / 2,
            'bottom-left': canvasHeight - adaptivePadding - totalHeight,
            'bottom-center': canvasHeight - adaptivePadding - totalHeight,
            'bottom-right': canvasHeight - adaptivePadding - totalHeight
        };
        
        y = verticalPositions[position] || verticalPositions['middle-center'];
        
        return { y };
    }

    /**
     * 计算水平位置
     * @param {number} lineWidth - 线条宽度
     * @returns {number} x坐标
     */
    calculateX(lineWidth) {
        const { position, padding } = this.config;
        const canvasWidth = this.canvas.width;
        
        const adaptivePadding = Math.min(padding, Math.floor(canvasWidth * 0.1));
        
        const horizontalPositions = {
            'top-left': adaptivePadding,
            'top-center': (canvasWidth - lineWidth) / 2,
            'top-right': canvasWidth - adaptivePadding - lineWidth,
            'middle-left': adaptivePadding,
            'middle-center': (canvasWidth - lineWidth) / 2,
            'middle-right': canvasWidth - adaptivePadding - lineWidth,
            'bottom-left': adaptivePadding,
            'bottom-center': (canvasWidth - lineWidth) / 2,
            'bottom-right': canvasWidth - adaptivePadding - lineWidth
        };
        
        return horizontalPositions[position] || horizontalPositions['middle-center'];
    }

    /**
     * 渲染平铺水印（支持换行）
     */
    renderTiledWatermark() {
        const { tiledSpacing, tiledRotation, tiledFontSize, text, color, opacity } = this.config;
        
        this.ctx.save();
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        this.ctx.globalAlpha = opacity;
        this.ctx.font = `${tiledFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`;
        this.ctx.fillStyle = color;
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        
        const lines = this.wrapText(text, 5);
        const lineHeight = tiledFontSize * 1.2;
        const maxLineWidth = Math.max(...lines.map(line => this.ctx.measureText(line).width));
        const totalTextHeight = lines.length * lineHeight;
        
        const watermarkWidth = maxLineWidth;
        const watermarkHeight = totalTextHeight;
        
        const diagonal = Math.sqrt(
            Math.pow(this.canvas.width, 2) + Math.pow(this.canvas.height, 2)
        );
        
        const startX = -diagonal / 2;
        const startY = -diagonal / 2;
        const endX = diagonal / 2 + this.canvas.width;
        const endY = diagonal / 2 + this.canvas.height;
        
        const stepX = watermarkWidth + tiledSpacing;
        const stepY = watermarkHeight + tiledSpacing;
        
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate((tiledRotation * Math.PI) / 180);
        this.ctx.translate(-centerX, -centerY);
        
        for (let y = startY; y < endY; y += stepY) {
            for (let x = startX; x < endX; x += stepX) {
                lines.forEach((line, lineIndex) => {
                    const lineY = y + lineIndex * lineHeight;
                    this.ctx.fillText(line, x, lineY);
                });
            }
        }
        
        this.ctx.restore();
    }

    /**
     * 渲染单个水印（带换行）
     */
    renderSingleWatermark() {
        const { fontSize, text, color, opacity } = this.config;
        
        this.ctx.save();
        
        this.ctx.globalAlpha = opacity;
        this.ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`;
        this.ctx.fillStyle = color;
        this.ctx.textBaseline = 'top';
        
        const lines = this.wrapText(text, 5);
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        
        this.ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`;
        const maxLineWidth = Math.max(...lines.map(line => this.ctx.measureText(line).width));
        
        const x = this.calculateX(maxLineWidth);
        const { y: startY } = this.calculatePosition(totalHeight);
        
        lines.forEach((line, index) => {
            const y = startY + index * lineHeight;
            this.ctx.fillText(line, x, y);
        });
        
        this.ctx.restore();
    }

    /**
     * 渲染图片和水印
     */
    render() {
        if (!this.originalImage) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.drawImage(
            this.originalImage,
            0, 0,
            this.canvas.width,
            this.canvas.height
        );
        
        if (this.config.layoutMode === 'tiled') {
            this.renderTiledWatermark();
        } else {
            this.renderSingleWatermark();
        }
    }

    /**
     * 导出最终图片
     * @param {string} format - 图片格式 ('png' | 'jpeg' | 'webp')
     * @param {number} quality - 图片质量 (0-1)
     * @returns {Promise<Blob>}
     */
    async exportImage(format = 'png', quality = 0.92) {
        return new Promise((resolve, reject) => {
            try {
                const mimeType = `image/${format}`;
                this.canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('图片导出失败'));
                        }
                    },
                    mimeType,
                    quality
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 获取图片数据 URL
     * @param {string} format - 图片格式
     * @param {number} quality - 图片质量
     * @returns {string}
     */
    getDataURL(format = 'png', quality = 0.92) {
        const mimeType = `image/${format}`;
        return this.canvas.toDataURL(mimeType, quality);
    }

    /**
     * 重置引擎状态
     */
    reset() {
        this.originalImage = null;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 检查是否有图片加载
     * @returns {boolean}
     */
    hasImage() {
        return this.originalImage !== null;
    }

    /**
     * 获取图片尺寸
     * @returns {{width: number, height: number}}
     */
    getImageSize() {
        return {
            width: this.originalWidth,
            height: this.originalHeight
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WatermarkEngine;
}
