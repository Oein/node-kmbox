from variables import b64alp
from zfill import nkb4

# @IGNORETOP

def nke1(a):
    global b64alp
    a = a.encode('utf8')
    a = ''.join([nkb4(bin(e)[2:], 8) for e in a])
    a = a + '0' * (len(a) % 6)
    a = [a[e:e+6] for e in range(0, len(a), 6)]
    a = [int(e, 2) for e in a]
    a = ''.join([b64alp[e] for e in a])
    a = a + '=' * (len(a) % 4)
    return a