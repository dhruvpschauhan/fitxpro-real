import urllib.request, urllib.parse
data = urllib.parse.urlencode({'username': 'admin', 'password': 'Admin@123'}).encode('utf-8')
req = urllib.request.Request('https://dhruvpschauhan-fitxpro-backend.hf.space/api/v1/auth/login', data=data)
try:
    urllib.request.urlopen(req)
except Exception as e:
    print(e.read().decode('utf-8'))
