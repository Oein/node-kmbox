from decop1 import nkb1
from decop2 import nkb2

# @IGNORETOP

def nke2(a):
    q = ''
    w = a.count('=')
    a = a.replace('=', '')
    for e in range(0, len(a), 4): q += nkb1(a[e:e+4]) if len(a[e:e+4]) == 4 else nkb2(a[e:e+4], w)
    r = bytes([int(q[bits:bits+8], 2) for bits in range(0, len(q), 8)]).decode('utf8')
    if w > 0: r = r[:-w]
    return r