from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.hazmat.primitives import hashes
import binascii

def print_p12_sha1(filepath, password):
    with open(filepath, "rb") as f:
        p12_data = f.read()
    try:
        private_key, certificate, additional_certificates = pkcs12.load_key_and_certificates(
            p12_data, password.encode()
        )
        if certificate:
            sha1_hash = certificate.fingerprint(hashes.SHA1())
            sha1_hex = binascii.hexlify(sha1_hash).decode('ascii').upper()
            sha1_formatted = ':'.join(sha1_hex[i:i+2] for i in range(0, len(sha1_hex), 2))
            print(f"SHA1: {sha1_formatted}")
    except Exception as e:
        print(f"Error reading PKCS12: {e}")

print_p12_sha1('./bongo_v2_upload.keystore', '20055002')
