import os
import paramiko
import json
import time
import requests  # 新增导入
from io import StringIO
from dotenv import load_dotenv
import logging

# 配置日志记录
logging.basicConfig(
    level=logging.ERROR, format="%(asctime)s - %(levelname)s - %(message)s"
)


# 加载本地 .env 文件中的环境变量（如果存在）
load_dotenv()


def remote_login(server_address, username, port, private_key):
    private_key_obj = paramiko.RSAKey.from_private_key(StringIO(private_key))
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=server_address, username=username, port=port, pkey=private_key_obj
    )
    return ssh


def pull_docker_image(ssh, image_url):
    if not image_url or ":" not in image_url:
        print("错误：无效的 Docker 镜像 URL 格式")
        return

    stdin, stdout, stderr = ssh.exec_command(f"docker pull {image_url}")
    print(stdout.read().decode())
    print(stderr.read().decode())


def backup_container_settings(ssh, container_name):
    stdin, stdout, stderr = ssh.exec_command(f"docker inspect {container_name}")
    container_info = stdout.read().decode()

    if not container_info:
        print(f"错误：未找到容器 {container_name} 的信息")
        return None

    backup_file = f"/root/{container_name}_backup.json"

    with ssh.open_sftp() as sftp:
        with sftp.file(backup_file, "w") as f:
            f.write(container_info)

    print(f"容器设置已备份到：{backup_file}")
    return backup_file


def recreate_container(ssh, old_container_name, new_image_url):
    # 生成初始的新容器名称
    new_container_name = f"{old_container_name}_old"

    # 检查新容器名称是否已被占用
    stdin, stdout, stderr = ssh.exec_command("docker ps -a --format '{{.Names}}'")
    existing_containers = stdout.read().decode().splitlines()

    # 如果新名称已被占用，则继续添加 "_old"
    while new_container_name in existing_containers:
        new_container_name += "_old"

    ssh.exec_command(f"docker rename {old_container_name} {new_container_name}")

    # 直接通过命令获取容器的设置
    stdin, stdout, stderr = ssh.exec_command(f"docker inspect {new_container_name}")
    container_info = json.loads(stdout.read().decode())
    ssh.exec_command(f"docker rm {new_container_name}")

    if not container_info:
        print(f"错误：未找到容器 {old_container_name} 的信息")
        return

    config = container_info[0]["Config"]

    create_command = f"docker run -d --name {old_container_name} "

    env_vars = config.get("Env", [])
    for env in env_vars:
        create_command += f'-e "{env}" '

    ports = container_info[0].get("NetworkSettings", {}).get("Ports", {})
    host_config = container_info[0].get("HostConfig", {})
    port_bindings = host_config.get("PortBindings", {})
    for port, bindings in port_bindings.items():
        for binding in bindings:
            host_ip = binding.get("HostIp", "0.0.0.0")
            host_port = binding.get("HostPort")
            create_command += f"-p {host_ip}:{host_port}:{port.split('/')[0]} "

    mounts = config.get("Volumes", {})
    if mounts:
        for mount in mounts.keys():
            create_command += f"-v {mount}:{mount} "

    networks = container_info[0].get("NetworkSettings", {}).get("Networks", {})
    for network_name in networks.keys():
        create_command += f"--network {network_name} "

    restart_policy = container_info[0].get("HostConfig", {}).get("RestartPolicy", {})
    if restart_policy.get("Name"):
        create_command += f"--restart {restart_policy['Name']} "
        if restart_policy.get("MaximumRetryCount") > 0:
            create_command += (
                f"--restart-max-retries {restart_policy['MaximumRetryCount']} "
            )

    time.sleep(5)  # 等待容器停止
    create_command += f"{new_image_url}"

    stdin, stdout, stderr = ssh.exec_command("docker ps -a --format '{{.Names}}'")
    existing_containers = stdout.read().decode().splitlines()
    # 检查旧容器是否存在，如果存在则删除
    if new_container_name in existing_containers:
        print(f"旧容器 {new_container_name} 存在，正在删除...")
        ssh.exec_command(f"docker rm -f {new_container_name}")

    # 创建新容器
    stdin, stdout, stderr = ssh.exec_command(create_command)
    print(stdout.read().decode())
    print(stderr.read().decode())


def get_image_url(api_url="https://api-us.hapx.one/lc"):
    try:
        logging.info(f"正在请求 URL: {api_url}")
        response = requests.get(api_url)
        logging.info(f"收到响应，状态码: {response.status_code}")

        if response.status_code == 200:
            try:
                data = response.json()
                logging.info(f"解析的 JSON 数据: {data}")
                image_name = data.get("image_name")
                if image_name is not None:
                    logging.info(f"找到的 image_name: {image_name}")
                    return image_name
                else:
                    logging.error("错误：响应中未找到 'image_name' 字段")
                    return None
            except ValueError as e:
                logging.error(f"错误：无法解析 JSON 响应: {e}")
                logging.error(f"响应内容: {response.text}")
                return None
        else:
            logging.error(
                f"错误：无法获取 Docker 镜像 URL，状态码: {response.status_code}"
            )
            logging.error(f"响应内容: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        logging.error(f"错误：网络请求失败: {e}")
        return None


def main():
    server_address = os.getenv("SERVER_ADDRESS")
    username = os.getenv("USERNAME")
    port = int(os.getenv("PORT", 22))
    private_key = os.getenv("PRIVATE_KEY")
    container_names = os.getenv("CONTAINER_NAMES").split("&")  # 支持多个容器名称

    if not all([server_address, username, private_key]):
        print("请确保 SERVER_ADDRESS, USERNAME 和 PRIVATE_KEY 环境变量已设置。")
        return

    ssh = remote_login(server_address, username, port, private_key)

    image_url = get_image_url()  # 获取 Docker 镜像 URL

    if not image_url:
        return

    for container_name in container_names:
        container_name = container_name.strip()  # 去除多余空格
        print(f"正在处理容器：{container_name}")

        backup_file = backup_container_settings(ssh, container_name)
        if not backup_file:
            continue

        pull_docker_image(ssh, image_url)

        recreate_container(ssh, container_name, image_url)

    ssh.close()


if __name__ == "__main__":
    main()
