import os
import paramiko
import json
import time
from io import StringIO
from dotenv import load_dotenv

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
        print("Error: Invalid Docker image URL format")
        return

    stdin, stdout, stderr = ssh.exec_command(f"docker pull {image_url}")
    print(stdout.read().decode())
    print(stderr.read().decode())


def backup_container_settings(ssh, container_name):
    stdin, stdout, stderr = ssh.exec_command(f"docker inspect {container_name}")
    container_info = stdout.read().decode()

    if not container_info:
        print(f"Error: No container info found for {container_name}")
        return None

    backup_file = f"/root/{container_name}_backup.json"

    with ssh.open_sftp() as sftp:
        with sftp.file(backup_file, "w") as f:
            f.write(container_info)

    print(f"Container settings backed up to: {backup_file}")
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

    # 重命名旧容器
    ssh.exec_command(f"docker rename {old_container_name} {new_container_name}")
    ssh.exec_command(f"docker stop {new_container_name}")

    # 直接通过命令获取容器的设置
    stdin, stdout, stderr = ssh.exec_command(f"docker inspect {new_container_name}")
    container_info = json.loads(stdout.read().decode())

    if not container_info:
        print(f"Error: No container info found for {old_container_name}")
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

    # 创建新容器
    stdin, stdout, stderr = ssh.exec_command(create_command)
    print(stdout.read().decode())
    print(stderr.read().decode())


def main():
    server_address = os.getenv("SERVER_ADDRESS")
    username = os.getenv("USERNAME")
    port = int(os.getenv("PORT", 22))
    private_key = os.getenv("PRIVATE_KEY")
    image_url = os.getenv("IMAGE_URL")
    container_names = os.getenv("CONTAINER_NAMES").split("&")  # 支持多个容器名称

    if not all([server_address, username, private_key, image_url]):
        print(
            "请确保 SERVER_ADDRESS, USERNAME, PRIVATE_KEY 和 IMAGE_URL 环境变量已设置。"
        )
        return

    ssh = remote_login(server_address, username, port, private_key)

    for container_name in container_names:
        container_name = container_name.strip()  # 去除多余空格
        print(f"Processing container: {container_name}")

        backup_file = backup_container_settings(ssh, container_name)
        if not backup_file:
            continue

        pull_docker_image(ssh, image_url)

        recreate_container(ssh, container_name, image_url)

    ssh.close()


if __name__ == "__main__":
    main()
