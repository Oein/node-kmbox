from decode import nke2
from encode import nke1

# @IGNORETOP

kmt1 = ""
def kmt2(a):
    global kmt1
    kmt1 += str(a) + "\n"



def kmt3(b):
    global print, kmt1
    kmt1 = ""
    d = print
    d("@=!@NKM0SPITER]!@")
    c = nke2(b)

    print = kmt2
    exec(c)
    print = d

    print(nke1(kmt1))
    print("@=!@NKM1SPITER]!@")




def r(b):
    global print
    d = print
    try: kmt3(b)
    finally: print = d