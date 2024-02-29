from zfill import nkb4
from variables import b64alp

# @IGNORETOP

def nkb1(c):
    return nkb4(bin(b64alp.index(c[0]))[2:], 6)[:6] + nkb4(bin(b64alp.index(c[1]))[2:], 6)[:6] + nkb4(bin(b64alp.index(c[2]))[2:], 6)[:6] + nkb4(bin(b64alp.index(c[3]))[2:], 6)[:6]