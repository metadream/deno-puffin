#!/bin/bash

export http_proxy=10.0.0.3:8889
export https_proxy=10.0.0.3:8889

git pull
systemctl restart puffin