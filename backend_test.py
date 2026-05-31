import urllib.request, json, uuid
boundary='----WebKitFormBoundary'+uuid.uuid4().hex
body=['--'+boundary,'Content-Disposition: form-data; name="fasta_sequence"','', '>TEST\nMKTIIALSYIFCLVFADYKDDDDK','--'+boundary+'--','']
body_bytes='\r\n'.join(body).encode('utf-8')
req=urllib.request.Request('http://127.0.0.1:8000/api/upload/protein-sequence', data=body_bytes, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
with urllib.request.urlopen(req) as resp:
    data=json.loads(resp.read().decode())
    print('upload', data)
    proj=data['project_id']
req2=urllib.request.Request('http://127.0.0.1:8000/api/analyze/start', data=json.dumps({'project_id': proj, 'temperature': 298.15, 'ph': 7.4}).encode('utf-8'), headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req2) as resp2:
    print('start', json.loads(resp2.read().decode()))
