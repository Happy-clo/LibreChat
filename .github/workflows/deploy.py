import os
import paramiko
import json
from io import StringIO


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
    server_address = os.environ.get("SERVER_ADDRESS")
    username = os.environ.get("USERNAME")
    port = int(os.environ.get("PORT"))
    private_key = os.environ.get("PRIVATE_KEY")
    image_url = os.environ.get("IMAGE_URL")
    container_name = "freeai"

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
