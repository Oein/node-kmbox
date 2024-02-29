import { SerialPort } from "serialport";
const kmboxcommand = require("../kmboxcommand.json");

export default class KMBox {
  serial: SerialPort;
  constructor(serial: SerialPort) {
    this.serial = serial;
  }
  initlized = false;
  async initlize(waitBetweenLines = 10) {
    for (const data of kmboxcommand) {
      this.serial.write(`${data}\r\n`);
      await new Promise((resolve) => setTimeout(resolve, waitBetweenLines));
    }

    this.initlized = true;
  }

  base64_alphabet =
    "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm0123456789+/";

  customB64Encode(data: string) {
    let to_encode = data;

    let chunks_8bit = to_encode
      .split("")
      .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");

    let chunks_6bit = [];
    for (let i = 0; i < chunks_8bit.length; i += 6) {
      chunks_6bit.push(chunks_8bit.substr(i, 6));
    }

    let padding_amount = 6 - chunks_6bit[chunks_6bit.length - 1].length;
    chunks_6bit[chunks_6bit.length - 1] += "0".repeat(padding_amount);

    let encoded = chunks_6bit
      .map((bits) => this.base64_alphabet[parseInt(bits, 2)])
      .join("");
    encoded += "=".repeat(Math.floor(padding_amount / 2));

    return encoded;
  }

  customB64Decode(a: string): string {
    const ORIGINALENCODING =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let dt = atob(
      a
        .split("")
        .map((x) => {
          return ORIGINALENCODING[this.base64_alphabet.indexOf(x)];
        })
        .join("")
    );
    // remove if last char is 0x00
    if (dt.charCodeAt(dt.length - 1) === 0) {
      dt = dt.slice(0, -1);
    }
    return dt;
  }

  setBase64Alphabet(alphabet: string) {
    if (!this.initlized) {
      throw new Error("Not initlized");
    }
    if (alphabet.length !== 64) {
      throw new Error("Alphabet must be 64 characters long");
    }
    if (alphabet.includes("@")) {
      throw new Error("Alphabet cannot contain @");
    }
    if (alphabet.includes("=")) {
      throw new Error("Alphabet cannot contain =");
    }
    this.base64_alphabet = alphabet;
    this.serial.write(`\r\n\r\nnkb3('${alphabet}')\r\n\r\n`);
  }

  randBase64Alphabet() {
    const ables =
      "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890-[];',./<>?:\"{}_+\\|!#$%^&*()~";
    let alphabet = "";
    while (alphabet.length < 64) {
      let char = ables[Math.floor(Math.random() * ables.length)];
      if (!alphabet.includes(char)) {
        alphabet += char;
      }
    }

    this.setBase64Alphabet(alphabet);
  }

  send(data: string) {
    return new Promise<string>((resolve, reject) => {
      if (!this.initlized) {
        throw new Error("Not initlized");
      }
      let buf = "";
      let state: "WATCHING" | "RECIEVING" = "WATCHING";

      const datahandler = (msg: Buffer) => {
        buf += msg.toString();
        if (buf.includes("@=!@NKM0SPITER]!@")) {
          state = "RECIEVING";
          buf = buf.split("@=!@NKM0SPITER]!@")[1];
        }
        if (buf.includes("@=!@NKM1SPITER]!@") && state === "RECIEVING") {
          this.serial.off("data", datahandler);
          const data = buf.split("@=!@NKM1SPITER]!@")[0];
          const de = this.customB64Decode(data);
          resolve(de);
        }
      };
      this.serial.on("data", datahandler);
      this.serial.write(`r('${this.customB64Encode(data)}')\r\n`);
    });
  }
}
