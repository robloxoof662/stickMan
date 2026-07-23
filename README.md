# StickMan Arena

一个以 iPad 横屏体验为优先的 Three.js 实时对战项目。当前版本是可运行的 MVP：

- Three.js 3D 竞技场和火柴人角色
- iPad 触控摇杆、攻击按钮、安全区域适配
- 桌面端 WASD / 方向键和空格键调试
- Node.js + WebSocket 权威服务器
- 玩家移动、朝向、攻击范围、伤害、击败计分和复活
- 30 Hz 服务端状态同步
- PWA 基础配置，可从 Safari 添加到主屏幕
- 服务端规则单元测试和 GitHub Actions CI

## 在 iPad 上开发并实时预览

推荐使用 GitHub Codespaces。它会在云端运行 Node.js、Vite 和游戏服务器；iPad 只负责显示网页版 VS Code 和游戏预览，因此不需要在 iPad 本机安装 Node.js。

### 第一次打开

1. 在 iPad Safari 登录 GitHub。
2. 打开项目仓库 `https://github.com/robloxoof662/stickMan`。
3. 点击 **Code** → **Codespaces** → **Create codespace on main**。
4. 等待云端环境创建完成。项目依赖会自动安装。
5. 在网页版 VS Code 中打开终端，运行：

   ```bash
   npm run dev
   ```

6. 端口 `5173` 启动后，GitHub 会自动打开 **StickMan 实时预览**。如果没有弹出，在底部 **PORTS** 面板中点击端口 `5173` 右侧的地球图标。

### 日常开发方式

- 一个 Safari 标签页打开 Codespaces 编辑器。
- 另一个 Safari 标签页打开游戏预览。
- 修改文件后会在 600 毫秒内自动保存，Vite 随后进行热更新。
- 使用 iPad 分屏也可以把编辑器和预览并排放置。
- 完成一段工作后，在 Codespaces 的 Source Control 面板提交并同步到 GitHub。
- 停止使用时，在 GitHub Codespaces 页面停止 codespace，避免继续消耗额度。

预览端口默认是私有的，只有登录当前 GitHub 账户后才能访问。若需要让第二台设备加入同一局测试，可在 **PORTS** 面板中把端口 `5173` 的可见性改为 Public，再将预览链接发给另一台设备；测试结束后改回 Private。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

电脑浏览器打开 `http://localhost:5173`。

在同一 Wi-Fi 下用 iPad 测试：

1. 在 Mac 上运行 `npm run dev`。
2. 查询 Mac 的局域网 IP，例如 `192.168.1.20`。
3. 在 iPad Safari 打开 `http://192.168.1.20:5173`。
4. 再打开一个浏览器窗口或另一台设备，就能测试双人状态同步。

如果 macOS 防火墙询问是否允许 Node 接受连接，请选择允许。

## 生产运行

```bash
npm run build
npm start
```

默认在 `http://localhost:8787` 同时提供网页和 `/ws` WebSocket 服务。线上部署必须使用 HTTPS/WSS；可通过 `PORT` 环境变量修改端口，通过 `VITE_WS_URL` 指定独立的 WebSocket 地址。

## 项目结构

```text
src/
  network/        客户端 WebSocket 和重连
  three/          Three.js 场景、角色和渲染
  ui/             触控与键盘输入
server/
  game.ts         权威游戏规则
  index.ts        HTTP、WebSocket 和状态广播
shared/
  protocol.ts     客户端与服务端共享协议
public/           PWA manifest 和图标
```

## 开发路线

### 里程碑 1：玩法原型（当前）

- 移动、攻击、伤害、复活
- 双人联网
- iPad 横屏触控
- 基础视觉反馈

### 里程碑 2：可玩的内测版

- 房间创建、邀请码和匹配
- 角色动画、受击、音效与粒子效果
- 碰撞体、障碍物和更可靠的命中判定
- 客户端预测、服务器校正和网络抖动处理
- 对局开始/结束、排行榜和重新匹配
- 真机 Safari 性能测试，目标稳定 60 FPS

### 里程碑 3：可发布版本

- 账号、昵称、游客登录和数据存储
- 防作弊、限流、断线重连和会话恢复
- 自动部署、日志、指标和错误监控
- 隐私政策、内容分级和数据删除流程
- 如果需要进入 App Store，再使用 Capacitor 包装；在玩法稳定前优先保持 Web/PWA 形态

## 关键技术决策

- **权威服务器**：伤害和得分只由服务器计算，避免客户端直接决定胜负。
- **WebGL 优先**：兼容较多 iPad 机型；后续可按设备能力评估 WebGPU。
- **同源部署**：生产环境由一个服务同时提供网页和 WebSocket，最容易配置 HTTPS/WSS。
- **先测真机**：iPad 的 GPU、触控、Safari 音频策略和内存限制都需要持续真机验证。

## 常用命令

```bash
npm run dev      # 同时启动客户端与服务器
npm run build    # 类型检查并生成生产构建
npm test         # 运行游戏规则测试
npm start        # 启动生产服务器
```
