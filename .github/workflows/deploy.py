import paramiko
import os


def remote_login(server_address, username, port, private_key):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=server_address, username=username, port=port, key_filename=private_key
    )
    return ssh


def pull_docker_image(ssh, image_url):
    stdin, stdout, stderr = ssh.exec_command(f"docker pull {image_url}")
    print(stdout.read().decode())
    print(stderr.read().decode())


def main():
    server_address = os.environ.get("SERVER_ADDRESS")
    username = os.environ.get("USERNAME")
    port = int(os.environ.get("PORT"))
    private_key = os.environ.get("PRIVATE_KEY")
    image_url = os.environ.get("IMAGE_URL")

    ssh = remote_login(server_address, username, port, private_key)
    pull_docker_image(ssh, image_url)
    ssh.close()


if __name__ == "__main__":
    main()
