import os
import paramiko
import json
from io import StringIO
from dotenv import load_dotenv

# 加载本地 .env 文件中的环境变量（如果存在）
load_dotenv()


def remote_login(server_address, username, port, private_key):
    # 使用 StringIO 来读取密钥内容
    private_key_obj = paramiko.RSAKey.from_private_key(StringIO(private_key))
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=server_address, username=username, port=port, pkey=private_key_obj
    )
    return ssh


def pull_docker_image(ssh, image_url):
    stdin, stdout, stderr = ssh.exec_command(f"docker pull {image_url}")
    print(stdout.read().decode())
    print(stderr.read().decode())


def backup_container_settings(ssh, container_name):
    # 获取容器的配置信息
    stdin, stdout, stderr = ssh.exec_command(f"docker inspect {container_name}")
    container_info = stdout.read().decode()

    # 生成备份文件名
    backup_file = f"/root/{container_name}_backup.json"

    # 将容器信息写入备份文件
    with ssh.open_sftp() as sftp:
        with sftp.file(backup_file, "w") as f:
            f.write(container_info)

    print(f"Container settings backed up to: {backup_file}")
    return backup_file


def recreate_container(ssh, old_container_name, new_image_url):
    # 重命名旧容器
    new_container_name = f"{old_container_name}_old"
    ssh.exec_command(f"docker rename {old_container_name} {new_container_name}")

    # 从备份中获取容器的设置
    stdin, stdout, stderr = ssh.exec_command(
        f"cat /root/{old_container_name}_backup.json"
    )
    container_info = json.loads(stdout.read().decode())

    # 提取必要的参数
    config = container_info[0]["Config"]

    # 创建新容器的命令
    create_command = f"docker run -d --name {old_container_name} "

    # 添加环境变量
    env_vars = config.get("Env", [])
    for env in env_vars:
        create_command += f"-e {env} "

    # 添加端口映射
    ports = container_info[0].get("NetworkSettings", {}).get("Ports", {})
    for port, bindings in ports.items():
        if bindings:
            for binding in bindings:
                create_command += f"-p {binding['HostPort']}:{port.split('/')[0]} "

    # 添加卷挂载
    mounts = config.get("Volumes", {})
    for mount in mounts.keys():
        create_command += f"-v {mount}:{mount} "

    # 添加网络设置
    networks = container_info[0].get("NetworkSettings", {}).get("Networks", {})
    for network_name, network_info in networks.items():
        create_command += f"--network {network_name} "

    # 添加重启策略
    restart_policy = container_info[0].get("HostConfig", {}).get("RestartPolicy", {})
    if restart_policy.get("Name"):
        create_command += f"--restart {restart_policy['Name']} "
        if restart_policy.get("MaximumRetryCount") > 0:
            create_command += (
                f"--restart-max-retries {restart_policy['MaximumRetryCount']} "
            )

    # 添加镜像
    create_command += f"{new_image_url}"

    # 创建新容器
    ssh.exec_command(create_command)


def main():
    # 从环境变量中获取配置
    server_address = os.getenv("SERVER_ADDRESS")
    username = os.getenv("USERNAME")
    port = int(os.getenv("PORT", 22))  # 默认端口为22
    private_key = os.getenv("PRIVATE_KEY")
    image_url = os.getenv("IMAGE_URL")
    container_name = "freeai"

    # 确保所有必需的环境变量都已设置
    if not all([server_address, username, private_key, image_url]):
        print(
            "请确保 SERVER_ADDRESS, USERNAME, PRIVATE_KEY 和 IMAGE_URL 环境变量已设置。"
        )
        return

    ssh = remote_login(server_address, username, port, private_key)

    # 备份容器设置
    backup_file = backup_container_settings(ssh, container_name)

    # 拉取新的 Docker 镜像
    pull_docker_image(ssh, image_url)

    # 重新创建容器
    recreate_container(ssh, container_name, image_url)

    ssh.close()


if __name__ == "__main__":
    main()