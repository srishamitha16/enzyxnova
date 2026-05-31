import urllib.request
import urllib.error
import json
import uuid

boundary = '----WebKitFormBoundary' + uuid.uuid4().hex
body = [
    '--' + boundary,
    'Content-Disposition: form-data; name="fasta_sequence"',
    '',
    '>TEST\nMKTIIALSYIFCLVFADYKDDDDK',
    '--' + boundary + '--',
    ''
]
body_bytes = '\r\n'.join(body).encode('utf-8')
req = urllib.request.Request(
    'http://127.0.0.1:8000/api/upload/protein-sequence',
    data=body_bytes,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)
try:
    with urllib.request.urlopen(req) as resp:
        print(resp.status)
        print(resp.read().decode())
except urllib.error.HTTPError as e:
    print('ERROR', e.code)
    print(e.read().decode())
