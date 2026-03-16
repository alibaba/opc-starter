#!/bin/bash
# OPC-Starter 完整认证流程测试用例
# 测试账号: opcstarter@test.com / opcstarter

set -e

echo "🚀 开始录制 OPC-Starter 认证流程测试..."

# 1. 启动 trace 录制
echo "1️⃣ 启动 trace 录制"
playwright-cli tracing-start

# 2. 打开应用
echo "2️⃣ 打开应用首页"
playwright-cli open http://localhost:5173

# 3. 点击注册链接
echo "3️⃣ 跳转到注册页面"
playwright-cli click e23

# 4. 填写注册表单
echo "4️⃣ 填写注册信息"
playwright-cli fill e17 "OPC Starter Test User"    # 昵称
playwright-cli fill e20 "opcstarter@test.com"       # 邮箱
playwright-cli fill e23 "opcstarter"                # 密码
playwright-cli fill e26 "opcstarter"                # 确认密码

# 5. 提交注册
echo "5️⃣ 提交注册"
playwright-cli click e27

# 等待注册完成并跳转
sleep 2
playwright-cli snapshot --filename=after-registration.yml

# 6. 登出
echo "6️⃣ 登出账户"
playwright-cli click e111

# 7. 登录流程
echo "7️⃣ 执行登录流程"
playwright-cli fill e253 "opcstarter@test.com"      # 邮箱
playwright-cli fill e256 "opcstarter"               # 密码
playwright-cli click e257                           # 登录按钮

# 等待登录完成
sleep 2
playwright-cli snapshot --filename=after-login-success.yml

# 8. 停止录制
echo "8️⃣ 停止 trace 录制"
playwright-cli tracing-stop

# 9. 关闭浏览器
echo "9️⃣ 关闭浏览器"
playwright-cli close

# 10. 打包 trace 文件
echo "🔟 打包 trace 文件"
cd .playwright-cli/traces
TRACE_FILE=$(ls -t trace-*.trace | head -1 | sed 's/\.trace$//')
zip -r "${TRACE_FILE}-complete.zip" "${TRACE_FILE}.trace" "${TRACE_FILE}.network" "${TRACE_FILE}.stacks" resources/

echo "✅ 测试完成！"
echo "📁 Trace 文件: .playwright-cli/traces/${TRACE_FILE}-complete.zip"
echo "📋 查看命令: npx playwright show-trace --host localhost --port 9323 ${TRACE_FILE}-complete.zip"