import os
import paramiko
import json
import time
import requests  # 新增导入，用于发送 HTTP 请求
from io import StringIO
from dotenv import load_dotenv  # 用于加载环境变量
import logging

# 配置日志记录
# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# 加载本地 .env 文件中的环境变量（如果存在）
# Load environment variables from local .env file (if it exists)
load_dotenv()


def remote_login(server_address, username, port, private_key):
    """
    使用 Paramiko 库远程登录到服务器。
    Use Paramiko library to log in to the server remotely.

    :param server_address: 服务器地址 / Server address
    :param username: 登录用户名 / Login username
    :param port: SSH 端口 / SSH port
    :param private_key: 私钥 / Private key
    :return: SSHClient 对象 / SSHClient object
    """
    private_key_obj = paramiko.RSAKey.from_private_key(
        StringIO(private_key)
    )  # 从私钥字符串创建私钥对象 / Create private key object from private key string
    ssh = paramiko.SSHClient()  # 创建 SSHClient 实例 / Create SSHClient instance
    ssh.set_missing_host_key_policy(
        paramiko.AutoAddPolicy()
    )  # 自动添加主机密钥 / Automatically add host key
    ssh.connect(
        hostname=server_address, username=username, port=port, pkey=private_key_obj
    )  # 连接到服务器 / Connect to the server
    return ssh


def pull_docker_image(ssh, image_url):
    """
    从 Docker 仓库拉取指定的 Docker 镜像。
    Pull the specified Docker image from the Docker repository.

    :param ssh: SSHClient 对象 / SSHClient object
    :param image_url: Docker 镜像 URL / Docker image URL
    """
    if not image_url or ":" not in image_url:
        logging.error(
            "错误：无效的 Docker 镜像 URL 格式"
        )  # Error: Invalid Docker image URL format
        return  # 如果图像 URL 无效，返回 / Return if the image URL is invalid

    # 执行拉取命令并获取输出 / Execute the pull command and get the output
    stdin, stdout, stderr = ssh.exec_command(f"docker pull {image_url}")
    logging.info(stdout.read().decode())  # 打印标准输出 / Print standard output
    logging.error(
        stderr.read().decode()
    )  # 打印标准错误输出 / Print standard error output


def backup_container_settings(ssh, container_name):
    """
    备份指定容器的设置。
    Backup the settings of the specified container.

    :param ssh: SSHClient 对象 / SSHClient object
    :param container_name: 容器名称 / Container name
    :return: 备份文件路径 / Backup file path
    """
    # 获取容器的详细信息 / Get detailed information about the container
    stdin, stdout, stderr = ssh.exec_command(f"docker inspect {container_name}")
    container_info = stdout.read().decode()

    # 如果未找到容器信息，则返回 None / Return None if container information is not found
    if not container_info:
        logging.error(
            f"错误：未找到容器 {container_name} 的信息"
        )  # Error: Could not find information for container
        return None

    backup_file = (
        f"/root/{container_name}_backup.json"  # 备份文件路径 / Backup file path
    )
    with ssh.open_sftp() as sftp:  # 使用 SFTP 进行文件传输 / Use SFTP for file transfer
        with sftp.file(backup_file, "w") as f:
            f.write(container_info)  # 写入容器信息 / Write container information
    logging.info(
        f"容器设置已备份到：{backup_file}"
    )  # Container settings have been backed up to
    return backup_file


def recreate_container(ssh, old_container_name, new_image_url):
    """
    重新创建指定的 Docker 容器。
    Recreate the specified Docker container.

    :param ssh: SSHClient 对象 / SSHClient object
    :param old_container_name: 旧容器名称 / Old container name
    :param new_image_url: 新的 Docker 镜像 URL / New Docker image URL
    """
    new_container_name = (
        f"{old_container_name}_old"  # 生成新容器名称 / Generate new container name
    )

    # 检查新容器名称是否已被占用 / Check if the new container name is already in use
    stdin, stdout, stderr = ssh.exec_command("docker ps -a --format '{{.Names}}'")
    existing_containers = (
        stdout.read().decode().splitlines()
    )  # 获取所有容器名称 / Get all container names

    # 如果新名称已被占用，则继续添加 "_old" / If the new name is occupied, keep adding "_old"
    while new_container_name in existing_containers:
        new_container_name += "_old"

    ssh.exec_command(
        f"docker rename {old_container_name} {new_container_name}"
    )  # 重命名旧容器 / Rename old container

    # 直接通过命令获取容器的设置 / Get the settings of the container directly through the command
    stdin, stdout, stderr = ssh.exec_command(f"docker inspect {new_container_name}")
    container_info = json.loads(
        stdout.read().decode()
    )  # 解析容器信息 / Parse container information
    ssh.exec_command(
        f"docker rm {new_container_name}"
    )  # 删除旧容器 / Remove old container

    # 如果未找到容器信息，直接返回 / Return directly if container information is not found
    if not container_info:
        logging.error(
            f"错误：未找到容器 {old_container_name} 的信息"
        )  # Error: Could not find information for container
        return

    config = container_info[0]["Config"]  # 获取容器配置 / Get container configuration
    create_command = f"docker run -d --name {old_container_name} "  # 创建新容器的基本命令 / Basic command to create new container

    # 添加环境变量 / Add environment variables
    env_vars = config.get("Env", [])
    for env in env_vars:
        create_command += f'-e "{env}" '  # 将每个环境变量添加到创建命令中 / Add each environment variable to the create command

    # 添加端口映射 / Add port mappings
    ports = container_info[0].get("NetworkSettings", {}).get("Ports", {})
    host_config = container_info[0].get("HostConfig", {})
    port_bindings = host_config.get("PortBindings", {})

    for port, bindings in port_bindings.items():
        for binding in bindings:
            host_ip = binding.get("HostIp", "0.0.0.0")  # 默认主机 IP / Default host IP
            host_port = binding.get("HostPort")
            create_command += f"-p {host_ip}:{host_port}:{port.split('/')[0]} "  # 添加端口映射 / Add port mapping

    # 添加卷挂载 / Add volume mounts
    mounts = config.get("Volumes", {})
    if mounts:
        for mount in mounts.keys():
            create_command += f"-v {mount}:{mount} "  # 将卷挂载到新容器 / Mount volumes to the new container

    # 添加网络设置 / Add network settings
    networks = container_info[0].get("NetworkSettings", {}).get("Networks", {})
    for network_name in networks.keys():
        create_command += f"--network {network_name} "  # 将网络设置添加到创建命令 / Add network settings to the create command

    # 添加重启策略 / Add restart policy
    restart_policy = container_info[0].get("HostConfig", {}).get("RestartPolicy", {})
    if restart_policy.get("Name"):
        create_command += f"--restart {restart_policy['Name']} "
        if restart_policy.get("MaximumRetryCount") > 0:
            create_command += (
                f"--restart-max-retries {restart_policy['MaximumRetryCount']} "
            )

    time.sleep(5)  # 等待容器停止 / Wait for the container to stop
    create_command += f"{new_image_url}"  # 添加新的镜像 URL / Add new image URL

    stdin, stdout, stderr = ssh.exec_command("docker ps -a --format '{{.Names}}'")
    existing_containers = (
        stdout.read().decode().splitlines()
    )  # 再次获取所有容器名称 / Get all container names again

    # 检查旧容器是否存在，如果存在则删除 / Check if the old container exists, if so, delete it
    if new_container_name in existing_containers:
        logging.info(
            f"旧容器 {new_container_name} 存在，正在删除..."
        )  # Old container exists, deleting...
        ssh.exec_command(
            f"docker rm -f {new_container_name}"
        )  # 强制删除旧容器 / Force delete old container

    time.sleep(10)  # 等待一段时间 / Wait for a while
    logging.info(
        "已休眠10s，正在创建新容器"
    )  # Logged: Sleeping for 10 seconds, creating new container
    stdin, stdout, stderr = ssh.exec_command(
        create_command
    )  # 创建新容器 / Create new container
    logging.info(stdout.read().decode())  # 打印标准输出 / Print standard output
    logging.error(
        stderr.read().decode()
    )  # 打印标准错误输出 / Print standard error output


def get_image_url(ssh, api_url="https://api-us.hapx.one/lc"):
    """
    从指定的 API 获取 Docker 镜像 URL。
    Get the Docker image URL from the specified API.

    :param ssh: SSHClient 对象 / SSHClient object
    :param api_url: API 地址 / API address
    :return: Docker 镜像 URL / Docker image URL
    """
    user_agent = os.getenv("USER_AGENT")  # 获取用户代理 / Get user agent

    # 构造远程命令 / Construct remote command
    remote_command = f"""
    python3 -c "
import requests, os, json
user_agent = '{user_agent}'  # 将用户代理传递给请求 / Pass user agent to the request
headers = {{'User-Agent': user_agent}}
response = requests.get('{api_url}', headers=headers)  # 发送 GET 请求 / Send GET request
if response.status_code == 200:
    data = response.json()  # 解析 JSON 响应 / Parse JSON response
    print(json.dumps(data))  # 打印 JSON 数据 / Print JSON data
else:
    print('错误：无法获取 Docker 镜像 URL，状态码: ' + str(response.status_code))  # Error: Cannot get Docker image URL
    print('响应内容: ' + response.text)  # 打印响应内容 / Print response content
"
    """
    stdin, stdout, stderr = ssh.exec_command(
        remote_command
    )  # 执行远程命令 / Execute remote command
    response_json = (
        stdout.read().decode().strip()
    )  # 读取标准输出 / Read standard output
    error_message = (
        stderr.read().decode().strip()
    )  # 读取标准错误输出 / Read standard error output

    # 如果有错误信息，记录日志并返回 None / If there is an error message, log it and return None
    if error_message:
        logging.error(f"错误：{error_message}")  # Error: {error_message}
        return None

    try:
        data = json.loads(response_json)  # 解析 JSON 响应 / Parse JSON response
        image_name = data.get(
            "image_name"
        )  # 获取 image_name 字段 / Get the image_name field
        if image_name is not None:
            logging.info(
                f"找到的 image_name: {image_name}"
            )  # Found image_name: {image_name}
            return image_name  # 返回 Docker 镜像名称 / Return Docker image name
        else:
            logging.error(
                "错误：响应中未找到 'image_name' 字段"
            )  # Error: 'image_name' field not found in response
            return None
    except ValueError as e:
        logging.error(
            f"错误：无法解析 JSON 响应: {e}"
        )  # Error: Unable to parse JSON response
        logging.error(
            f"响应内容: {response_json}"
        )  # 打印响应内容以供调试 / Print response content for debugging
        return None


def cleanup_unused_images(ssh):
    """
    清理未使用的 Docker 镜像。
    Clean up unused Docker images.

    :param ssh: SSHClient 对象 / SSHClient object
    """
    logging.info(
        "正在清理未使用的 Docker 镜像..."
    )  # Cleaning up unused Docker images...
    stdin, stdout, stderr = ssh.exec_command(
        "docker image prune -a -f"
    )  # 执行清理命令 / Execute cleanup command
    logging.info(stdout.read().decode())  # 打印标准输出 / Print standard output
    logging.error(
        stderr.read().decode()
    )  # 打印标准错误输出 / Print standard error output


def main():
    """
    主函数，负责协调整个部署过程。
    Main function, responsible for coordinating the entire deployment process.
    """
    # 从环境变量中获取服务器连接信息 / Get server connection information from environment variables
    server_address = os.getenv("SERVER_ADDRESS")
    username = os.getenv("USERNAME")
    port = int(os.getenv("PORT", 22))  # 默认 SSH 端口为 22 / Default SSH port is 22
    private_key = os.getenv("PRIVATE_KEY")
    container_names = os.getenv("CONTAINER_NAMES").split(
        "&"
    )  # 支持多个容器名称 / Support multiple container names

    # 检查必要的环境变量 / Check necessary environment variables
    if not all([server_address, username, private_key]):
        logging.error(
            "请确保 SERVER_ADDRESS, USERNAME 和 PRIVATE_KEY 环境变量已设置。"
        )  # Please ensure SERVER_ADDRESS, USERNAME, and PRIVATE_KEY environment variables are set.
        return

    ssh = remote_login(
        server_address, username, port, private_key
    )  # 远程登录 / Remote login
    image_url = get_image_url(ssh)  # 获取 Docker 镜像 URL / Get Docker image URL

    if not image_url:
        return  # 如果未获取到镜像 URL，结束程序 / If no image URL is obtained, end the program

    # 遍历每个容器名称 / Iterate over each container name
    for container_name in container_names:
        container_name = container_name.strip()  # 去除多余空格 / Remove extra spaces
        logging.info(
            f"正在处理容器：{container_name}"
        )  # Processing container: {container_name}
        backup_file = backup_container_settings(
            ssh, container_name
        )  # 备份容器设置 / Backup container settings

        # 如果未找到容器，则跳过后续操作 / If the container is not found, skip subsequent operations
        if not backup_file:
            continue

        pull_docker_image(
            ssh, image_url
        )  # 拉取新的 Docker 镜像 / Pull new Docker image
        recreate_container(
            ssh, container_name, image_url
        )  # 重新创建容器 / Recreate container

    # 清理未使用的 Docker 镜像 / Clean up unused Docker images
    cleanup_unused_images(ssh)
    ssh.close()  # 关闭 SSH 连接 / Close SSH connection


if __name__ == "__main__":
    main()  # 执行主函数 / Execute main function
