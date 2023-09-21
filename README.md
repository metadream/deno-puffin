# Puffin

Puffin是一款轻量级开源视频媒体系统，旨在帮助人们更好地组织、管理、观看本地视频文件，并对浏览器不支持的视频格式进行自动转码输出，广泛适用于电影电视、个人视频、MV、AV等场景。Puffin基于Deno、FFMPEG、HLS等技术开发，没有收费许可、没有隐藏功能、没有附加条件，只为构建一个简单、便捷、高效的媒体管理平台供大众使用。欢迎任何有兴趣的人参与优化系统功能和改善用户体验。

## 运行环境

安装Deno运行时:
```sh
curl -fsSL https://deno.land/x/install/install.sh | sh
deno --version
# deno: 1.36.4
# v8: 11.6.189.12
# typescript: 5.1.6
```

## 部署

1. 获取源代码
```sh
git clone https://github.com/metadream/deno-puffin.git puffin
```
2. 创建系统服务
```sh
# vi /etc/systemd/system/puffin.service

[Unit]
Description=Puffin Media System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/puffin
ExecStart=/root/.deno/bin/deno task start
StandardOutput=file:/root/puffin/puffin.log
Restart=on-failure

[Install]
WantedBy=multi-user.target
```