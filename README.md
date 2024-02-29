# node-kmbox

## Introduction

This is a simple node.js module to interact with the KMBox B Pro with base64 encoding.

## Example Usage

```ts
import KMBox from "node-kmbox";
import { SerialPort } from "serialport";

async function main(pth: string) {
  const nse = new SerialPort({
    path: pth,
    baudRate: 115200,
  });

  nse.on("data", (e) => {
    process.stdout.write(e);
  });
  nse.on("resume", () => {
    console.log("Resume");
  });
  nse.open(async () => {
    console.log("Opened");
    const box = new KMBox(nse);
    await box.initlize();
    box.send(`km.move(100, 100, 10)`).then((msg: string) => {
      console.log(msg);
    });
  });
  process.stdin.on("data", (e) => {
    e = Buffer.from(e.toString().replace(/\n/g, "\r\n"));
    nse.write(e);
  });
}

async function seriallist() {
  SerialPort.list().then((ports) => {
    console.log(ports);
  });
}

// seriallist();
main("/dev/tty.usbserial-11110");
```
