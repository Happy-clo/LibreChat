import time
import random
import sys

# 定义颜色
colors = [
    "\033[91m",  # 红色
    "\033[92m",  # 绿色
    "\033[93m",  # 黄色
    "\033[94m",  # 蓝色
    "\033[95m",  # 紫色
    "\033[96m",  # 青色
    "\033[97m",  # 白色
    "\033[0m",  # 重置颜色
]


# 随机代码生成
def generate_random_code():
    code_length = random.randint(40, 100)  # 生成更长的代码
    code = "".join(
        random.choices(
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_(){}[];",
            k=code_length,
        )
    )
    return code


# 模拟复杂的构建过程
def complex_build_process():
    print("\033[91m[!] 开始构建项目...\033[0m")
    time.sleep(1)

    for i in range(10):
        color = random.choice(colors[:-1])  # 随机选择颜色
        print(f"{color}[{i + 1}/10] 编译模块 {random.randint(1, 5)}...\033[0m")
        time.sleep(1)

        # 输出大量随机代码
        for _ in range(random.randint(5, 15)):
            print(f"{color}>>> {generate_random_code()}\033[0m")
            time.sleep(0.1)

        print(f"{color}[{i + 1}/10] 模块编译完成...\033[0m")
        time.sleep(1)

    print("\033[93m[+] 所有模块编译完成!\033[0m")
    time.sleep(1)

    print("\033[94m[+] 开始打包...\033[0m")
    time.sleep(1)

    for i in range(5):
        color = random.choice(colors[:-1])  # 随机选择颜色
        print(f"{color}[打包进度] {random.randint(1, 100)}%...\033[0m")
        time.sleep(0.5)

        # 输出随机代码
        for _ in range(random.randint(5, 10)):
            print(f"{color}>>> {generate_random_code()}\033[0m")
            time.sleep(0.1)

    print("\033[92m[!] 打包完成!\033[0m")
    time.sleep(1)


# 防御黑客入侵
def defense_success():
    print("\033[96m[+] 成功防御黑客入侵!\033[0m")
    print("\033[94m[+] 系统安全!\033[0m")


if __name__ == "__main__":
    complex_build_process()
    time.sleep(2)  # 等待一段时间
    defense_success()
