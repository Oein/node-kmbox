from zfill import nkb4
from variables import b64alp

# @IGNORETOP

def nkb2(c, p):
    q = []
    for w in c:q.append(b64alp.index(w))
    for i in range(0, p):q.append(0)
    e = ''
    for w in q:e += nkb4(bin(w)[2:], 6)[:6]
    return e